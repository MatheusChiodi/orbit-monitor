import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConnectionInput, ConnectionTestResult } from '@/shared/api/consoleTypes';
import type { Connection, DatabaseKind } from '@/shared/api/types';
import { translate } from '@/shared/i18n/message';
import { Button, Checkbox, Dialog, Field, SecretInput, Select, TextInput } from '@/shared/ui';
import {
  DATABASE_KINDS,
  JDBC_EXAMPLES,
  emptyDraft,
  kindOfJdbcUrl,
  newId,
  toInput,
  validateDraft,
  type ConnectionDraft,
  type DraftErrors,
} from '../model';
import { ConnectionTestStatus, type ConnectionTestState } from '../ConnectionTestStatus';

export interface ConnectionDialogProps {
  open: boolean;
  /** Connection being edited; absent for a new one. */
  connection?: Connection;
  /** "Change password": the same dialog, opened from the row menu. */
  rotate?: boolean;
  /** Ids already used, so a new connection gets a free one. */
  takenIds: readonly string[];
  onClose: () => void;
  onSave: (id: string, input: ConnectionInput) => Promise<Connection>;
  onSaved: (connection: Connection) => void;
  /** "Test connection" before saving; absent when the server cannot test typed settings. */
  onTestDraft?: (draft: ConnectionInput & { id?: string }) => Promise<ConnectionTestResult>;
}

/** Add or edit a database connection. The password is write-only: typed here, sealed by the server, never shown. */
export function ConnectionDialog(props: ConnectionDialogProps) {
  // A fresh form every time the dialog opens (the password input is uncontrolled on purpose).
  return props.open ? <ConnectionForm {...props} /> : null;
}

function ConnectionForm({ connection, rotate = false, takenIds, onClose, onSave, onSaved, onTestDraft }: ConnectionDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ConnectionDraft>(() => emptyDraft(connection));
  const [kind, setKind] = useState<DatabaseKind>(() => kindOfJdbcUrl(connection?.jdbcUrl ?? '') ?? 'POSTGRES');
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<ConnectionTestState | undefined>();
  const stored = Boolean(connection?.password);
  const formId = 'connection-dialog-form';

  const patch = (next: Partial<ConnectionDraft>) => setDraft((d) => ({ ...d, ...next }));
  const error = (key: keyof DraftErrors) => (errors[key] ? translate(t, errors[key]) : undefined);

  async function runTest() {
    if (!onTestDraft) return;
    const found = validateDraft(draft, stored);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setTest({ phase: 'testing' });
    let result: ConnectionTestResult;
    try {
      result = await onTestDraft({ ...toInput(draft), ...(connection ? { id: connection.id } : {}) });
    } catch (e) {
      result = { ok: false, ms: 0, error: e instanceof Error ? e.message : null };
    }
    setTest({ phase: 'done', result });
  }

  async function submit() {
    const found = validateDraft(draft, stored);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const id = connection?.id ?? newId(draft.name, takenIds);
      onSaved(await onSave(id, toInput(draft)));
    } catch (e) {
      setSaveError(t('monitorForm.connections.errors.saveFailed', { error: e instanceof Error ? e.message : '' }));
    } finally {
      setSaving(false);
    }
  }

  const title = rotate ? 'rotateTitle' : connection ? 'editTitle' : 'addTitle';
  return (
    <Dialog
      open
      onClose={onClose}
      title={t(`monitorForm.connections.${title}`)}
      description={connection ? connection.name : t('monitorForm.connections.description')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          {onTestDraft && (
            <Button variant="secondary" loading={test?.phase === 'testing'} onClick={() => void runTest()}>
              {t('monitorForm.connections.test')}
            </Button>
          )}
          <Button variant="primary" type="submit" form={formId} loading={saving}>
            {t('monitorForm.connections.save')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {!rotate && (
          <>
            <Field label={t('monitorForm.connections.name')} error={error('name')}>
              <TextInput value={draft.name} placeholder={t('monitorForm.connections.namePlaceholder')} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t('monitorForm.connections.kind')}>
                <Select value={kind} onChange={(e) => setKind(e.target.value as DatabaseKind)}>
                  {DATABASE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`monitorForm.connections.kinds.${k}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                className="sm:col-span-2"
                label={t('monitorForm.connections.jdbcUrl')}
                hint={t('monitorForm.connections.jdbcHint', { example: JDBC_EXAMPLES[kind] })}
                error={error('jdbcUrl')}

              >
                <TextInput
                  className="font-mono"
                  spellCheck={false}
                  autoComplete="off"
                  value={draft.jdbcUrl}
                  placeholder={JDBC_EXAMPLES[kind]}
                  onChange={(e) => {
                    patch({ jdbcUrl: e.target.value });
                    const guessed = kindOfJdbcUrl(e.target.value);
                    if (guessed) setKind(guessed);
                  }}
                />
              </Field>
            </div>
            <Field label={t('monitorForm.connections.username')} hint={t('monitorForm.connections.usernameHint')} error={error('username')}>
              <TextInput autoComplete="off" spellCheck={false} value={draft.username} onChange={(e) => patch({ username: e.target.value })} />
            </Field>
          </>
        )}
        <div className="flex flex-col gap-2">
          {draft.useEnv ? (
            <Field label={t('monitorForm.connections.passwordEnv')} error={error('password')}>
              <TextInput className="font-mono" spellCheck={false} value={draft.passwordEnv} placeholder="ORBIT_DB_PASSWORD" onChange={(e) => patch({ passwordEnv: e.target.value })} />
            </Field>
          ) : (
            <>
              <SecretInput label={t('monitorForm.connections.password')} onChange={(password) => patch({ password })} />
              {stored && <p className="m-0 text-sm text-muted">{t('monitorForm.connections.passwordKeep')}</p>}
              {errors.password && (
                <p role="alert" className="m-0 text-sm text-down-text">
                  {error('password')}
                </p>
              )}
            </>
          )}
          <Checkbox label={t('monitorForm.connections.useEnv')} checked={draft.useEnv} onChange={(e) => patch({ useEnv: e.target.checked })} />
        </div>
        {test && <ConnectionTestStatus state={test} />}
        {saveError && (
          <p role="alert" className="m-0 rounded-sm border border-down/40 bg-down/10 px-3 py-2 text-sm text-down-text">
            {saveError}
          </p>
        )}
      </form>
    </Dialog>
  );
}
