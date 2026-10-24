import { useEffect, useRef, useState, type ReactNode } from 'react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ConnectionDialog } from '@/domains/connections/ConnectionDialog';
import { useConnectionTests } from '@/domains/connections/ConnectionTestStatus';
import { newId } from '@/domains/connections/model';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { currentLocale } from '@/shared/i18n/i18n';
import { translate, type Message } from '@/shared/i18n/message';
import type { CatalogTable, ConnectionInput, ConnectionTestResult, GroupInput, SavedQuery } from '@/shared/api/consoleTypes';
import type { MonitorSaveResult } from '@/shared/api/monitorTargets';
import type { Connection, Group, MonitorDefinition, PreviewRequest, PreviewResult } from '@/shared/api/types';
import { Button, StickyActionBar } from '@/shared/ui';
import { defaultConditions, validateCondition } from '../../conditions';
import { mergeSuggested, suggestFields } from '../../display';
import {
  buildDefinition,
  buildTarget,
  initialFormState,
  isPreviewable,
  previewContext,
  validateForm,
  validateTarget,
  type KeptCondition,
  type MonitorFormState,
  type MonitorKind,
} from '../../form';
import { ConditionBuilder } from '../ConditionBuilder';
import { useConditionSentence } from '../ConditionEditor';
import { FormStepper } from '../FormStepper';
import { AUTO_GROUP } from '../GroupSelect';
import { PreviewPanel } from '../PreviewPanel';
import { ReviewStep } from '../ReviewStep';
import { TargetStep } from '../TargetStep';
import { DataStep } from './DataStep';
import { reviewItems } from './reviewItems';
import { conditionFields, stepsFor, type StepId } from './steps';
import { TargetFields } from './TargetFields';
import { useCatalog, useSavedQueries } from './useCatalog';

export interface MonitorFormProps {
  groups: readonly Group[];
  connections: readonly Connection[];
  onPreview: (target: PreviewRequest) => Promise<PreviewResult>;
  /** May resolve with the save result (a new push monitor carries its one-time `pushUrl`). */
  onSave: (definition: MonitorDefinition) => Promise<MonitorSaveResult | void>;
  onCancel: () => void;
  /** Kind of a new monitor (step 0 or the route `#/monitors/new/http`). */
  initialType?: MonitorKind;
  /** Edit, duplicate or template: the form starts from this state. */
  initialState?: MonitorFormState;
  mode?: 'create' | 'edit';
  /** Saved rules the visual editor cannot show; the screen saves them back unchanged. */
  keptConditions?: readonly KeptCondition[];
  /** FE-33: tables and columns of a connection for SQL autocomplete (`/api/connections/{id}/catalog`). */
  onLoadCatalog?: (connectionId: string) => Promise<CatalogTable[]>;
  /** BE-12: saved queries of a connection (`/api/query-catalog?connectionId=`). */
  onLoadSavedQueries?: (connectionId: string) => Promise<SavedQuery[]>;
  onCreateGroup?: (group: GroupInput) => Promise<Group>;
  onSaveConnection?: (id: string, connection: ConnectionInput) => Promise<Connection>;
  onTestConnection?: (id: string) => Promise<ConnectionTestResult>;
  /** Back to the kind chooser (create only). */
  onChangeKind?: () => void;
  /** Shown above the steps (e.g. "secrets are not copied"). */
  notice?: ReactNode;
}

const noTest = async (): Promise<ConnectionTestResult> => ({ ok: false, ms: 0, error: null });

/** Guided monitor form: Target → Data → Conditions → Review, with Save always in the sticky bar. */
export function MonitorForm(props: MonitorFormProps) {
  const { groups, connections, onPreview, onSave, onCancel, initialType = 'HTTP', initialState, mode = 'create', keptConditions = [] } = props;
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const enter = useMotionPreset('enter');
  const [state, setState] = useState<MonitorFormState>(
    () => initialState ?? { ...initialFormState(), type: initialType, conditions: defaultConditions(initialType) },
  );
  const [step, setStep] = useState<StepId>('target');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingConnection, setAddingConnection] = useState(false);
  const [added, setAdded] = useState<Connection[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const { tests, run: testConnection } = useConnectionTests(props.onTestConnection ?? noTest);
  const sentence = useConditionSentence();

  const patch = (next: Partial<MonitorFormState>) => setState((s) => ({ ...s, ...next }));
  const steps = stepsFor(state.type);
  const current = steps.includes(step) ? step : 'target';
  const index = steps.indexOf(current);
  const previewable = isPreviewable(state.type);
  const allConnections = [...connections, ...added.filter((a) => !connections.some((c) => c.id === a.id))];
  const autoGroup = groups.length === 0 && (!state.groupId || state.groupId === AUTO_GROUP);
  const groupId = autoGroup ? AUTO_GROUP : state.groupId || (groups.length === 1 ? groups[0]!.id : '');
  const fields = conditionFields(state.type, state.fields, state.conditions, preview, t);
  const catalog = useCatalog(state.type === 'SQL' ? state.connectionId : '', props.onLoadCatalog);
  const savedQueries = useSavedQueries(state.type === 'SQL' ? state.connectionId : '', props.onLoadSavedQueries);

  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [current]);

  const formErrors: Message[] = attempted ? validateForm({ ...state, groupId }) : [];
  const ruleErrors = attempted
    ? state.conditions.flatMap((c, i) => {
        const error = validateCondition(c, fields.map((f) => f.key));
        return error ? [`${t('monitorForm.rules.rule', { n: i + 1 })}: ${translate(t, error)}`] : [];
      })
    : [];
  const errorText = (m: Message) => (m.key === 'form.errors.groupRequired' ? t('monitorForm.group.required') : translate(t, m));
  const nameError = formErrors.find((m) => m.key === 'form.errors.nameRequired');
  const groupError = formErrors.find((m) => m.key === 'form.errors.groupRequired');
  const otherErrors = formErrors.filter((m) => m !== nameError && m !== groupError).map(errorText);
  const problems = formErrors.length + ruleErrors.length;
  const invalid: StepId[] = [...(formErrors.length ? (['target'] as const) : []), ...(ruleErrors.length ? (['conditions'] as const) : [])];
  const targetErrors = validateTarget(state);

  function go(next: StepId) {
    moved.current = true;
    setStep(next);
  }

  async function runPreview() {
    if (state.type !== 'SQL' && state.type !== 'HTTP') return;
    setRunning(true);
    setPreviewError(null);
    try {
      const target = buildTarget(state);
      const result = await onPreview(target.type === 'SQL' ? { ...target, intervalSeconds: state.intervalSeconds } : target);
      setPreview(result);
      patch({ fields: mergeSuggested(state.fields, suggestFields(result, state.type, locale)) });
    } catch (e) {
      setPreview(null);
      setPreviewError(e instanceof Error ? e.message : t('form.previewFailed'));
    } finally {
      setRunning(false);
    }
  }

  async function save() {
    setAttempted(true);
    setServerError(null);
    const blocking = validateForm({ ...state, groupId }).length > 0 || state.conditions.some((c) => validateCondition(c, fields.map((f) => f.key)));
    if (blocking) {
      go(validateForm({ ...state, groupId }).length > 0 ? 'target' : 'conditions');
      return;
    }
    setSaving(true);
    try {
      let id = groupId;
      if (autoGroup) {
        if (!props.onCreateGroup) throw new Error(t('monitorForm.group.required'));
        const name = t('monitorForm.group.defaultName');
        id = (await props.onCreateGroup({ id: newId(name), name, order: 0 })).id;
        patch({ groupId: id });
      }
      await onSave(buildDefinition({ ...state, groupId: id }));
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t('form.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const stepLabel = (s: StepId) => t(`monitorForm.flow.steps.${s}`);
  const reason = targetErrors[0] ? translate(t, targetErrors[0]) : null;
  const previewAction = previewable ? (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" onClick={runPreview} loading={running} disabled={running || reason !== null} aria-describedby={reason ? 'preview-reason' : undefined}>
        {t('form.runPreview')}
      </Button>
      {reason && (
        <span id="preview-reason" className="text-sm text-muted">
          {t('monitorForm.flow.previewNeeds', { reason })}
        </span>
      )}
    </div>
  ) : null;

  let body: ReactNode;
  if (current === 'target') {
    body = (
      <TargetStep
        state={state}
        onChange={patch}
        groups={groups}
        groupId={groupId}
        onCreateGroup={props.onCreateGroup}
        nameError={nameError ? errorText(nameError) : undefined}
        groupError={groupError ? errorText(groupError) : undefined}
        onChangeKind={mode === 'create' ? props.onChangeKind : undefined}
        previewAction={previewAction}
        target={
          <TargetFields
            state={state}
            connections={allConnections}
            onChange={patch}
            catalog={catalog.catalog}
            catalogStatus={catalog.status}
            savedQueries={savedQueries}
            onAddConnection={props.onSaveConnection ? () => setAddingConnection(true) : undefined}
            connectionTest={tests[state.connectionId]}
          />
        }
        preview={
          <PreviewPanel
            previewable={previewable}
            preview={preview}
            error={previewError}
            running={running}
            intervalSeconds={state.intervalSeconds}
            onUseInterval={(intervalSeconds) => patch({ intervalSeconds })}
          />
        }
      />
    );
  } else if (current === 'data') {
    body = <DataStep state={state} preview={preview} onChange={patch} onGoToTarget={() => go('target')} />;
  } else if (current === 'conditions') {
    body = (
      <div className="flex flex-col gap-3 rounded-md border border-line bg-s1 p-4">
        <ConditionBuilder
          conditions={state.conditions}
          fields={fields}
          context={preview ? previewContext(preview) : null}
          onChange={(conditions) => patch({ conditions })}
          addDisabledReason={t('monitorForm.rules.addNeedsPreview')}
        />
        {keptConditions.length > 0 && (
          <p className="m-0 text-sm text-muted">
            {t('monitorForm.flow.keptRules', { count: keptConditions.length, rules: keptConditions.map((k) => k.expression).join('; ') })}
          </p>
        )}
      </div>
    );
  } else {
    body = (
      <ReviewStep
        items={reviewItems({ state, groups, groupId, connections: allConnections, keptConditions, sentences: state.conditions.map((c) => sentence(c, fields)), t })}
        onEdit={(s) => go(s as StepId)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {props.notice}
      <FormStepper steps={steps} current={current} invalid={invalid} label={stepLabel} onSelect={go} />
      {(otherErrors.length > 0 || ruleErrors.length > 0 || serverError) && (
        <ul role="alert" className="m-0 flex list-none flex-col gap-1 rounded-sm border border-down/40 bg-down/10 px-3 py-2 text-sm text-down-text">
          {[...otherErrors, ...ruleErrors, ...(serverError ? [serverError] : [])].map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <m.div key={current} initial={enter.initial} animate={enter.animate} transition={enter.transition} data-motion="step" data-motion-level={enter.level} className="flex flex-col gap-4">
        <h2 ref={heading} tabIndex={-1} className="m-0 text-lg font-semibold text-text focus:outline-none">
          {stepLabel(current)}
        </h2>
        {body}
      </m.div>
      <StickyActionBar
        status={
          problems > 0 ? (
            <span className="text-down-text">{t('monitorForm.flow.problems', { count: problems })}</span>
          ) : (
            <span className="hidden sm:inline">{t('monitorForm.flow.stepOf', { n: index + 1, total: steps.length })}</span>
          )
        }
      >
        <Button variant="ghost" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        {index > 0 && (
          // On phones the stepper already goes back; the bar keeps Cancel, Next and Save on one line.
          <span className="hidden sm:contents">
            <Button variant="secondary" onClick={() => go(steps[index - 1]!)}>
              {t('monitorForm.flow.back')}
            </Button>
          </span>
        )}
        {index < steps.length - 1 && (
          <Button variant="secondary" aria-label={t('monitorForm.flow.next', { step: stepLabel(steps[index + 1]!) })} onClick={() => go(steps[index + 1]!)}>
            <span className="sm:hidden">{t('monitorForm.flow.nextShort')}</span>
            <span className="hidden sm:inline">{t('monitorForm.flow.next', { step: stepLabel(steps[index + 1]!) })}</span>
          </Button>
        )}
        <Button variant="primary" onClick={save} loading={saving}>
          {mode === 'edit' ? t('monitorForm.flow.saveChanges') : t('monitorForm.flow.add')}
        </Button>
      </StickyActionBar>
      {props.onSaveConnection && (
        <ConnectionDialog
          open={addingConnection}
          takenIds={allConnections.map((c) => c.id)}
          onClose={() => setAddingConnection(false)}
          onSave={props.onSaveConnection}
          onSaved={(connection) => {
            setAddingConnection(false);
            setAdded((list) => [...list.filter((c) => c.id !== connection.id), connection]);
            patch({ connectionId: connection.id });
            if (props.onTestConnection) void testConnection(connection.id);
          }}
        />
      )}
    </div>
  );
}
