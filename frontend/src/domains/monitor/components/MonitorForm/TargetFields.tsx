import { useTranslation } from 'react-i18next';
import { ConnectionTestStatus, type ConnectionTestState } from '@/domains/connections/ConnectionTestStatus';
import type { SavedQuery } from '@/shared/api/consoleTypes';
import type { Connection, HttpMethod } from '@/shared/api/types';
import { Button, IconPlus, INPUT_CLASS, SELECT_CLASS, TextArea } from '@/shared/ui';
import type { MonitorFormState } from '../../form';
import { CheckTargetFields } from '../CheckTargetFields';
import { FormField } from '../FormField';
import { HttpStepsFields } from '../HttpStepsFields';
import { OAuthFields } from '../OAuthFields';
import { SqlCodeEditor, type SqlCatalog } from '../SqlCodeEditor';

export { FormField };

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'unavailable';
const EMPTY_CATALOG: SqlCatalog = { tables: [] };

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'HEAD'];

export interface TargetFieldsProps {
  state: MonitorFormState;
  connections: readonly Connection[];
  onChange: (patch: Partial<MonitorFormState>) => void;
  /** FE-33: tables and columns of the chosen connection (BE-13). */
  catalog?: SqlCatalog;
  catalogStatus?: CatalogStatus;
  /** BE-12: saved queries of the chosen connection. */
  savedQueries?: readonly SavedQuery[];
  /** Opens the "Add connection" dialog; absent when connections cannot be created here. */
  onAddConnection?: () => void;
  /** Result of the last test of the chosen connection. */
  connectionTest?: ConnectionTestState;
  /** "Save to catalog": keeps this SELECT as a saved query of the connection. */
  onSaveQuery?: () => void;
}

function SqlTarget({ state, connections, onChange, catalog = EMPTY_CATALOG, catalogStatus = 'idle', savedQueries = [], onAddConnection, connectionTest, onSaveQuery }: TargetFieldsProps) {
  const { t } = useTranslation();
  const none = connections.length === 0;
  return (
    <>
      <div className="flex flex-col gap-2">
        <FormField label={t('form.connection')}>
          {(id) => (
            <div className="flex min-w-0 gap-2">
              <select id={id} className={`${SELECT_CLASS} flex-1`} value={state.connectionId} onChange={(e) => onChange({ connectionId: e.target.value })}>
                <option value="" disabled>
                  {none ? t('monitorForm.connections.select.none') : t('monitorForm.connections.select.choose')}
                </option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.name} · ${t(`monitorForm.connections.kinds.${c.kind}`)}`}
                  </option>
                ))}
              </select>
              {onAddConnection && (
                <Button variant={none ? 'primary' : 'secondary'} className="shrink-0" onClick={onAddConnection}>
                  <IconPlus />
                  {t('monitorForm.connections.add')}
                </Button>
              )}
            </div>
          )}
        </FormField>
        {none && <p className="m-0 text-sm text-muted">{t('monitorForm.connections.select.addHint')}</p>}
        {state.connectionId && connectionTest && <ConnectionTestStatus state={connectionTest} />}
      </div>
      {savedQueries.length > 0 && (
        <FormField label={t('monitorForm.savedQuery')}>
          {(id) => (
            <select
              id={id}
              className={SELECT_CLASS}
              value=""
              onChange={(e) => {
                const chosen = savedQueries.find((q) => q.id === e.target.value);
                if (chosen) onChange({ sql: chosen.sql });
              }}
            >
              <option value="">{t('form.choose')}</option>
              {savedQueries.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          )}
        </FormField>
      )}
      <SqlCodeEditor value={state.sql} catalog={catalog} onChange={(sql) => onChange({ sql })} />
      {onSaveQuery && state.connectionId && state.sql.trim() && (
        <div>
          <Button variant="ghost" size="sm" onClick={onSaveQuery}>
            {t('monitorForm.queries.saveFromForm')}
          </Button>
        </div>
      )}
      {catalogStatus === 'loading' && <p className="m-0 text-xs text-dim">{t('monitorForm.catalogLoading')}</p>}
      {catalogStatus === 'unavailable' && <p className="m-0 text-xs text-dim">{t('monitorForm.catalogUnavailable')}</p>}
    </>
  );
}

/** Target fields per monitor kind: SQL, HTTP (+ OAuth2), HTTP steps or a check target. */
export function TargetFields(props: TargetFieldsProps) {
  const { state, onChange } = props;
  const { t } = useTranslation();
  if (state.type === 'HTTP_STEPS') {
    return (
      <>
        <HttpStepsFields steps={state.steps} onChange={(steps) => onChange({ steps })} />
        <OAuthFields state={state} onChange={onChange} />
      </>
    );
  }
  if (state.type === 'SQL') return <SqlTarget {...props} />;
  if (state.type !== 'HTTP') return <CheckTargetFields state={state} onChange={onChange} />;

  const hasBody = state.method === 'POST' || state.method === 'PUT';
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <FormField label={t('form.method')}>
          {(id) => (
            <select id={id} className={`${SELECT_CLASS} font-mono`} value={state.method} onChange={(e) => onChange({ method: e.target.value as HttpMethod })}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <div className="col-span-3">
          <FormField label={t('form.url')}>
            {(id) => (
              <input
                id={id}
                type="url"
                inputMode="url"
                spellCheck={false}
                className={`${INPUT_CLASS} font-mono`}
                placeholder="https://portal.example/health"
                value={state.url}
                onChange={(e) => onChange({ url: e.target.value })}
              />
            )}
          </FormField>
        </div>
      </div>
      <FormField label={t('form.headers')}>
        {(id) => (
          <TextArea
            id={id}
            rows={3}
            mono
            spellCheck={false}
            placeholder="Accept: application/json"
            value={state.headersText}
            onChange={(e) => onChange({ headersText: e.target.value })}
          />
        )}
      </FormField>
      {hasBody && (
        <FormField label={t('form.body')}>
          {(id) => <TextArea id={id} rows={3} mono spellCheck={false} value={state.body} onChange={(e) => onChange({ body: e.target.value })} />}
        </FormField>
      )}
      <OAuthFields state={state} onChange={onChange} />
      <p className="m-0 text-xs text-dim">{t('form.secretsNote')}</p>
    </>
  );
}
