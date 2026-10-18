import { useId, type ReactNode } from 'react';
import type { Connection, HttpMethod } from '@/shared/api/types';
import { INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';
import type { MonitorFormState } from '../../form';
import { SqlEditor } from '../SqlEditor';

export function FormField({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-[0.3rem]">
      <label htmlFor={id} className="text-[0.8rem] text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'HEAD'];

export interface TargetFieldsProps {
  state: MonitorFormState;
  connections: readonly Connection[];
  onChange: (patch: Partial<MonitorFormState>) => void;
}

/** Campos do alvo: conexão + SELECT, ou método + URL + headers + body. */
export function TargetFields({ state, connections, onChange }: TargetFieldsProps) {
  if (state.type === 'SQL') {
    return (
      <>
        <FormField label="Conexão">
          {(id) => (
            <select
              id={id}
              className={SELECT_CLASS}
              value={state.connectionId}
              onChange={(e) => onChange({ connectionId: e.target.value })}
            >
              <option value="">Escolha…</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.name} · ${c.kind}`}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <SqlEditor value={state.sql} onChange={(sql) => onChange({ sql })} />
      </>
    );
  }

  const hasBody = state.method === 'POST' || state.method === 'PUT';
  return (
    <>
      <div className="grid grid-cols-[7rem_1fr] gap-[0.6rem]">
        <FormField label="Método">
          {(id) => (
            <select
              id={id}
              className={`${SELECT_CLASS} font-mono`}
              value={state.method}
              onChange={(e) => onChange({ method: e.target.value as HttpMethod })}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="URL">
          {(id) => (
            <input
              id={id}
              className={`${INPUT_CLASS} font-mono`}
              placeholder="https://portal.exemplo/health"
              value={state.url}
              onChange={(e) => onChange({ url: e.target.value })}
            />
          )}
        </FormField>
      </div>
      <FormField label="Headers (um por linha, Nome: valor)">
        {(id) => (
          <textarea
            id={id}
            className={`${INPUT_CLASS} h-auto min-h-[4.5rem] py-[0.5rem] font-mono`}
            placeholder="Accept: application/json"
            value={state.headersText}
            onChange={(e) => onChange({ headersText: e.target.value })}
          />
        )}
      </FormField>
      {hasBody && (
        <FormField label="Body">
          {(id) => (
            <textarea
              id={id}
              className={`${INPUT_CLASS} h-auto min-h-[4.5rem] py-[0.5rem] font-mono`}
              value={state.body}
              onChange={(e) => onChange({ body: e.target.value })}
            />
          )}
        </FormField>
      )}
      <p className="m-0 text-[0.75rem] text-dim">Segredos (tokens, senhas) vão para o cofre e voltam como •••• (cofre).</p>
    </>
  );
}
