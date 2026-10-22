import { useId, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { currentLocale } from '@/shared/i18n/i18n';
import { translate } from '@/shared/i18n/message';
import type { CatalogTable } from '@/shared/api/consoleTypes';
import type { MonitorSaveResult } from '@/shared/api/monitorTargets';
import type { Connection, Group, MonitorDefinition, PreviewRequest, PreviewResult } from '@/shared/api/types';
import { Button, INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';
import { addPickedField, suggestFields } from '../../display';
import {
  MONITOR_KINDS,
  buildDefinition,
  buildTarget,
  conditionFieldsFor,
  initialFormState,
  isPreviewable,
  previewContext,
  validateForm,
  validateTarget,
  type MonitorFormState,
  type MonitorKind,
} from '../../form';
import { ConditionBuilder } from '../ConditionBuilder';
import { DataDisplayStep } from '../DataDisplayStep';
import { JsonExplorer } from '../JsonExplorer';
import { PreviewTable } from '../PreviewTable';
import { FormField, TargetFields } from './TargetFields';
import { useCatalog } from './useCatalog';

function parseJson(body: string | null | undefined): unknown {
  if (!body) return undefined;
  const trimmed = body.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

export interface MonitorFormProps {
  groups: readonly Group[];
  connections: readonly Connection[];
  onPreview: (target: PreviewRequest) => Promise<PreviewResult>;
  /** May resolve with the save result (a new push monitor carries its one-time `pushUrl`). */
  onSave: (definition: MonitorDefinition) => Promise<MonitorSaveResult | void>;
  onCancel: () => void;
  /** Kind preselected by the route (`#/monitors/new/http`). */
  initialType?: MonitorKind;
  /** FE-33: tables and columns of a connection for SQL autocomplete (`/api/connections/{id}/catalog`). */
  onLoadCatalog?: (connectionId: string) => Promise<CatalogTable[]>;
}

interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  /** `expand`: the section grows into view (height + opacity). */
  motionKind?: 'expand';
}

function Section({ title, children, className = '', motionKind }: SectionProps) {
  const id = useId();
  const expand = useMotionPreset('expand');
  const motionProps = motionKind
    ? { initial: expand.initial, animate: expand.animate, exit: expand.exit, transition: expand.transition }
    : { initial: false as const };
  return (
    <motion.section
      {...motionProps}
      data-motion={motionKind}
      data-motion-level={expand.level}
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-[0.8rem] rounded-[0.9rem] border border-line bg-s1 p-[1rem] ${className}`}>
      <h2 id={id} className="section-label m-0">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

function ErrorList({ errors }: { errors: readonly string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul role="alert" className="m-0 list-none p-0 text-[0.85rem] text-down-text">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

/** Monitor form: configuration on the left, live preview on the right. */
export function MonitorForm({ groups, connections, onPreview, onSave, onCancel, onLoadCatalog, initialType = 'SQL' }: MonitorFormProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const skeletonShimmer = useMotionPreset('enter').level === 'off' ? '' : 'anim-shimmer';
  const [state, setState] = useState<MonitorFormState>(() => ({ ...initialFormState(), type: initialType }));
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<MonitorFormState>) => setState((s) => ({ ...s, ...next }));
  const targetErrors = validateTarget(state);
  const previewable = isPreviewable(state.type);
  const fieldNames = previewable ? state.fields.map((f) => f.field) : conditionFieldsFor(state.type);
  const catalog = useCatalog(state.type === 'SQL' ? state.connectionId : '', onLoadCatalog);
  const json = state.type === 'HTTP' ? parseJson(preview?.body) : undefined;

  function switchType(type: MonitorFormState['type']) {
    patch({ type, fields: [], conditions: [] });
    setPreview(null);
    setPreviewError(null);
  }

  async function runPreview() {
    setRunning(true);
    setPreviewError(null);
    try {
      if (state.type !== 'SQL' && state.type !== 'HTTP') return;
      const target = buildTarget(state);
      const result = await onPreview(target.type === 'SQL' ? { ...target, intervalSeconds: state.intervalSeconds } : target);
      setPreview(result);
      patch({ fields: suggestFields(result, state.type, locale) });
    } catch (e) {
      setPreview(null);
      setPreviewError(e instanceof Error ? e.message : t('form.previewFailed'));
    } finally {
      setRunning(false);
    }
  }

  async function save() {
    const errors = validateForm(state).map((m) => translate(t, m));
    setSaveErrors(errors);
    if (errors.length > 0) return;
    setSaving(true);
    try {
      await onSave(buildDefinition(state));
    } catch (e) {
      setSaveErrors([e instanceof Error ? e.message : t('form.saveFailed')]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <div className="grid grid-cols-1 gap-[1rem] lg:grid-cols-2">
        <Section title={t('form.configuration')}>
          <div role="radiogroup" aria-label={t('form.type')} className="flex flex-wrap gap-[0.4rem]">
            {MONITOR_KINDS.map((type) => (
              <label
                key={type}
                className={`flex h-[2.2rem] cursor-pointer items-center gap-[0.4rem] rounded-[0.45rem] border px-[0.8rem] text-[0.85rem] font-semibold ${state.type === type ? 'border-info bg-info/12 text-info' : 'border-line-2 text-muted'}`}
              >
                <input type="radio" name="monitor-type" className="sr-only" checked={state.type === type} onChange={() => switchType(type)} />
                {t(`monitorForm.types.${type}`)}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-[0.6rem] sm:grid-cols-2">
            <FormField label={t('form.name')}>
              {(id) => <input id={id} className={INPUT_CLASS} value={state.name} onChange={(e) => patch({ name: e.target.value })} />}
            </FormField>
            <FormField label={t('form.group')}>
              {(id) => (
                <select id={id} className={SELECT_CLASS} value={state.groupId} onChange={(e) => patch({ groupId: e.target.value })}>
                  <option value="">{t('form.choose')}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label={t('form.interval')}>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={15}
                  max={86400}
                  className={`${INPUT_CLASS} font-mono`}
                  value={state.intervalSeconds}
                  onChange={(e) => patch({ intervalSeconds: Number(e.target.value) })}
                />
              )}
            </FormField>
            <FormField label={t('form.retries')}>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  max={10}
                  className={`${INPUT_CLASS} font-mono`}
                  value={state.retries}
                  onChange={(e) => patch({ retries: Number(e.target.value) })}
                />
              )}
            </FormField>
          </div>
          <TargetFields state={state} connections={connections} onChange={patch} catalog={catalog.catalog} catalogStatus={catalog.status} />
          {previewable && (
            <div>
              <Button variant="primary" onClick={runPreview} disabled={running || targetErrors.length > 0}>
                {t('form.runPreview')}
              </Button>
            </div>
          )}
        </Section>

        <Section title={t('form.preview')}>
          {previewError && (
            <p role="alert" className="m-0 font-mono text-[0.85rem] text-down-text">
              {previewError}
            </p>
          )}
          {running && (
            <p
              role="status"
              aria-busy="true"
              data-skeleton
              className={`m-0 rounded-[0.45rem] p-[0.6rem] text-muted ${skeletonShimmer}`}
            >
              {t('form.running')}
            </p>
          )}
          {!previewable ? (
            <p className="m-0 text-[0.85rem] text-muted">{t('monitorForm.noPreview')}</p>
          ) : preview ? (
            <>
              {preview.cost && preview.cost.level !== 'NONE' && (
                <div role="note" className="flex flex-wrap items-center gap-[0.6rem] rounded-[0.45rem] border border-warn/50 bg-warn/12 px-[0.7rem] py-[0.4rem] text-[0.85rem] text-warn-text">
                  <span>{preview.cost.message}</span>
                  {preview.cost.suggestedIntervalSeconds > state.intervalSeconds && (
                    <Button variant="ghost" onClick={() => patch({ intervalSeconds: preview.cost!.suggestedIntervalSeconds })}>
                      {t('monitorForm.useInterval', { seconds: preview.cost.suggestedIntervalSeconds })}
                    </Button>
                  )}
                </div>
              )}
              <PreviewTable preview={preview} />
            </>
          ) : (
            !previewError && !running && <p className="m-0 text-[0.85rem] text-muted">{t('form.previewEmpty')}</p>
          )}
        </Section>
      </div>

      {preview && (
        <Section title={t('form.dataDisplay')} motionKind="expand">
          {json !== undefined && (
            <div className="flex flex-col gap-[0.4rem]">
              <span className="text-[0.8rem] text-muted">{t('monitorForm.jsonExplorerHint')}</span>
              <div className="max-h-[18rem] overflow-auto rounded-[0.6rem] border border-line p-[0.5rem]">
                <JsonExplorer value={json} onPick={(pick) => patch({ fields: addPickedField(state.fields, pick, preview) })} />
              </div>
            </div>
          )}
          <DataDisplayStep fields={state.fields} onChange={(fields) => patch({ fields })} />
        </Section>
      )}

      <Section title={t('form.conditions')}>
        <ConditionBuilder
          conditions={state.conditions}
          fields={fieldNames}
          context={preview ? previewContext(preview) : null}
          onChange={(conditions) => patch({ conditions })}
        />
      </Section>

      <ErrorList errors={saveErrors} />
      <div className="flex justify-end gap-[0.6rem]">
        <Button variant="ghost" onClick={onCancel}>
          {t('form.cancel')}
        </Button>
        <Button variant="primary" onClick={save} disabled={saving}>
          {t('form.save')}
        </Button>
      </div>
    </div>
  );
}
