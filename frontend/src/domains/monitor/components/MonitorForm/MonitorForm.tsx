import { useId, useState, type ReactNode } from 'react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { currentLocale } from '@/shared/i18n/i18n';
import { translate } from '@/shared/i18n/message';
import type { Connection, Group, MonitorDefinition, PreviewRequest, PreviewResult } from '@/shared/api/types';
import { Button, INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';
import { suggestFields } from '../../display';
import { buildDefinition, buildTarget, initialFormState, previewContext, validateForm, validateTarget, type MonitorFormState } from '../../form';
import { ConditionEditor } from '../ConditionEditor';
import { DataDisplayStep } from '../DataDisplayStep';
import { PreviewTable } from '../PreviewTable';
import { FormField, TargetFields } from './TargetFields';

export interface MonitorFormProps {
  groups: readonly Group[];
  connections: readonly Connection[];
  onPreview: (target: PreviewRequest) => Promise<PreviewResult>;
  onSave: (definition: MonitorDefinition) => Promise<void>;
  onCancel: () => void;
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
    <m.section
      {...motionProps}
      data-motion={motionKind}
      data-motion-level={expand.level}
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-[0.8rem] rounded-[0.9rem] border border-line bg-s1 p-[1rem] ${className}`}>
      <h2 id={id} className="section-label m-0">
        {title}
      </h2>
      {children}
    </m.section>
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
export function MonitorForm({ groups, connections, onPreview, onSave, onCancel }: MonitorFormProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const skeletonShimmer = useMotionPreset('enter').level === 'off' ? '' : 'anim-shimmer';
  const [state, setState] = useState<MonitorFormState>(initialFormState);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const patch = (next: Partial<MonitorFormState>) => setState((s) => ({ ...s, ...next }));
  const targetErrors = validateTarget(state);
  const fieldNames = state.fields.map((f) => f.field);

  function switchType(type: MonitorFormState['type']) {
    patch({ type, fields: [], conditions: [] });
    setPreview(null);
    setPreviewError(null);
  }

  async function runPreview() {
    setRunning(true);
    setPreviewError(null);
    try {
      const result = await onPreview(buildTarget(state));
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
          <div role="radiogroup" aria-label={t('form.type')} className="flex gap-[0.4rem]">
            {(['SQL', 'HTTP'] as const).map((type) => (
              <label
                key={type}
                className={`flex h-[2.2rem] cursor-pointer items-center gap-[0.4rem] rounded-[0.45rem] border px-[0.8rem] text-[0.85rem] font-semibold ${state.type === type ? 'border-info bg-info/12 text-info' : 'border-line-2 text-muted'}`}
              >
                <input type="radio" name="monitor-type" className="sr-only" checked={state.type === type} onChange={() => switchType(type)} />
                {type}
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
          <TargetFields state={state} connections={connections} onChange={patch} />
          <div>
            <Button variant="primary" onClick={runPreview} disabled={running || targetErrors.length > 0}>
              {t('form.runPreview')}
            </Button>
          </div>
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
          {preview ? (
            <PreviewTable preview={preview} />
          ) : (
            !previewError && !running && <p className="m-0 text-[0.85rem] text-muted">{t('form.previewEmpty')}</p>
          )}
        </Section>
      </div>

      {preview && (
        <Section title={t('form.dataDisplay')} motionKind="expand">
          <DataDisplayStep fields={state.fields} onChange={(fields) => patch({ fields })} />
        </Section>
      )}

      <Section title={t('form.conditions')}>
        <ConditionEditor
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
