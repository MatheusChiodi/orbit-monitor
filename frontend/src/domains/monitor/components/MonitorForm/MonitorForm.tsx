import { useId, useState, type ReactNode } from 'react';
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

function Section({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-[0.8rem] rounded-[0.9rem] border border-line bg-s1 p-[1rem] ${className}`}>
      <h2 id={id} className="section-label m-0">
        {title}
      </h2>
      {children}
    </section>
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

/** Formulário de monitor: configuração à esquerda, preview ao vivo à direita. */
export function MonitorForm({ groups, connections, onPreview, onSave, onCancel }: MonitorFormProps) {
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
      patch({ fields: suggestFields(result, state.type) });
    } catch (e) {
      setPreview(null);
      setPreviewError(e instanceof Error ? e.message : 'Falha ao executar o preview');
    } finally {
      setRunning(false);
    }
  }

  async function save() {
    const errors = validateForm(state);
    setSaveErrors(errors);
    if (errors.length > 0) return;
    setSaving(true);
    try {
      await onSave(buildDefinition(state));
    } catch (e) {
      setSaveErrors([e instanceof Error ? e.message : 'Falha ao salvar']);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <div className="grid grid-cols-1 gap-[1rem] lg:grid-cols-2">
        <Section title="Configuração">
          <div role="radiogroup" aria-label="Tipo" className="flex gap-[0.4rem]">
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
            <FormField label="Nome">
              {(id) => <input id={id} className={INPUT_CLASS} value={state.name} onChange={(e) => patch({ name: e.target.value })} />}
            </FormField>
            <FormField label="Grupo">
              {(id) => (
                <select id={id} className={SELECT_CLASS} value={state.groupId} onChange={(e) => patch({ groupId: e.target.value })}>
                  <option value="">Escolha…</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label="Intervalo (s)">
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
            <FormField label="Tentativas antes de marcar fora">
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
              Executar preview
            </Button>
          </div>
        </Section>

        <Section title="Preview">
          {previewError && (
            <p role="alert" className="m-0 font-mono text-[0.85rem] text-down-text">
              {previewError}
            </p>
          )}
          {running && <p className="m-0 text-muted">Executando…</p>}
          {preview ? (
            <PreviewTable preview={preview} />
          ) : (
            !previewError && !running && <p className="m-0 text-[0.85rem] text-muted">Execute o preview para ver o resultado e escolher os dados.</p>
          )}
        </Section>
      </div>

      {preview && (
        <Section title="Dados e exibição">
          <DataDisplayStep fields={state.fields} onChange={(fields) => patch({ fields })} />
        </Section>
      )}

      <Section title="Condições">
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
          Cancelar
        </Button>
        <Button variant="primary" onClick={save} disabled={saving}>
          Salvar monitor
        </Button>
      </div>
    </div>
  );
}
