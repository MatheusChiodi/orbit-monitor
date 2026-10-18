import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

/** Target fields: connection + SELECT, or method + URL + headers + body. */
export function TargetFields({ state, connections, onChange }: TargetFieldsProps) {
  const { t } = useTranslation();
  if (state.type === 'SQL') {
    return (
      <>
        <FormField label={t('form.connection')}>
          {(id) => (
            <select
              id={id}
              className={SELECT_CLASS}
              value={state.connectionId}
              onChange={(e) => onChange({ connectionId: e.target.value })}
            >
              <option value="">{t('form.choose')}</option>
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
        <FormField label={t('form.method')}>
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
        <FormField label={t('form.url')}>
          {(id) => (
            <input
              id={id}
              className={`${INPUT_CLASS} font-mono`}
              placeholder="https://portal.example/health"
              value={state.url}
              onChange={(e) => onChange({ url: e.target.value })}
            />
          )}
        </FormField>
      </div>
      <FormField label={t('form.headers')}>
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
        <FormField label={t('form.body')}>
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
      <p className="m-0 text-[0.75rem] text-dim">{t('form.secretsNote')}</p>
    </>
  );
}
