import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Field, SecretInput, Select, Switch, TextArea, TextInput } from '@/shared/ui';
import { CHANNEL_TYPES, type Channel, type ChannelType, type GroupRef, type MessageLocale, type MinSeverity, type SmtpSecurity } from '../api/notificationsApi';
import { GroupScope } from '../GroupScope';
import { CHANNEL_SHAPE, draftFromChannel, newId, toChannelRequest, validateChannel, type ChannelDraft, type ChannelErrors } from '../model/channelForm';
import { errorMessage, useNotifications } from '../model/queries';

export interface ChannelDialogProps {
  open: boolean;
  /** Absent = new channel. */
  channel?: Channel;
  groups: readonly GroupRef[];
  takenIds: readonly string[];
  onClose: () => void;
  /** `test` = the operator asked to send a test right after saving. */
  onSaved: (channel: Channel, test: boolean) => void;
}

/** Add or edit a notification channel; secrets are typed only and never shown back. */
export function ChannelDialog(props: ChannelDialogProps) {
  // A fresh form each time it opens, so typed secrets never survive a close.
  return props.open ? <ChannelForm key={props.channel?.id ?? 'new'} {...props} /> : null;
}

function ChannelForm({ channel, groups, takenIds, onClose, onSaved }: ChannelDialogProps) {
  const { t, i18n } = useTranslation();
  const { api } = useNotifications();
  const [draft, setDraft] = useState<ChannelDraft>(() => draftFromChannel(channel, i18n.language === 'pt-BR' ? 'pt-BR' : 'en'));
  const [errors, setErrors] = useState<ChannelErrors>({});
  const shape = CHANNEL_SHAPE[draft.type];
  const sameType = channel?.type === draft.type;
  const set = (patch: Partial<ChannelDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const err = (field: keyof ChannelErrors) => (errors[field] ? t(`notificationSettings.channels.errors.${errors[field]}` as 'notificationSettings.channels.errors.name') : undefined);

  const save = useMutation({
    mutationFn: ({ test }: { test: boolean }) =>
      api.saveChannel(channel?.id ?? newId(draft.name, takenIds), toChannelRequest(draft)).then((saved) => ({ saved, test })),
    onSuccess: ({ saved, test }) => onSaved(saved, test),
  });

  const submit = (test: boolean) => {
    const found = validateChannel(draft, channel);
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate({ test });
  };

  const changeType = (type: ChannelType) => set({ type, url: '', token: '', signingSecret: '', recipients: '' });
  const storedSecret = (field: 'url' | 'token' | 'signingSecret') => sameType && Boolean(channel?.[field]);
  const storedRecipients = sameType ? (channel?.recipients ?? []) : [];

  const recipientsLabel = draft.type === 'EMAIL' ? 'emails' : draft.type === 'TELEGRAM' ? 'chatIds' : 'phones';
  const recipientsHint = storedRecipients.length
    ? t('notificationSettings.channels.form.recipientsStored', { count: storedRecipients.length, list: storedRecipients.join(', ') })
    : t(`notificationSettings.channels.form.${draft.type === 'EMAIL' ? 'emailsHint' : draft.type === 'TELEGRAM' ? 'chatIdsHint' : 'phonesHint'}`);

  const urlLabel = draft.type === 'TELEGRAM' ? 'botApi' : draft.type === 'WHATSAPP' ? 'whatsappEndpoint' : 'webhook';
  const urlHint =
    draft.type === 'TELEGRAM'
      ? t('notificationSettings.channels.form.botApiHint')
      : storedSecret('url')
        ? t('notificationSettings.channels.form.webhookHintStored')
        : draft.type === 'WHATSAPP'
          ? undefined
          : t('notificationSettings.channels.form.webhookHint');
  const tokenLabel = draft.type === 'EMAIL' ? 'smtpPassword' : draft.type === 'TELEGRAM' ? 'botToken' : 'whatsappToken';

  return (
    <Dialog
      open
      onClose={onClose}
      title={channel ? t('notificationSettings.channels.edit') : t('notificationSettings.channels.add')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('notificationSettings.cancel')}
          </Button>
          <Button variant="secondary" disabled={save.isPending} onClick={() => submit(true)}>
            {t('notificationSettings.channels.form.saveAndTest')}
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={() => submit(false)}>
            {t('notificationSettings.channels.form.save')}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        {save.isError && (
          <p role="alert" className="m-0 text-sm text-down-text">
            {t('notificationSettings.channels.saveFailed', { message: errorMessage(save.error) })}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('notificationSettings.channels.form.name')} error={err('name')} required>
            <TextInput value={draft.name} placeholder={t('notificationSettings.channels.form.namePlaceholder')} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label={t('notificationSettings.channels.form.type')}>
            <Select value={draft.type} onChange={(e) => changeType(e.target.value as ChannelType)}>
              {CHANNEL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`notificationSettings.types.${type}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {shape.url && (
          <SecretField
            key={`url-${draft.type}`}
            label={t(`notificationSettings.channels.form.${urlLabel}`)}
            stored={storedSecret('url')}
            hint={urlHint}
            error={err('url')}
            onChange={(url) => set({ url })}
          />
        )}
        {shape.token && !shape.smtp && (
          <SecretField
            key={`token-${draft.type}`}
            label={t(`notificationSettings.channels.form.${tokenLabel}`)}
            stored={storedSecret('token')}
            hint={storedSecret('token') ? t('notificationSettings.channels.form.secretStored') : undefined}
            error={err('token')}
            onChange={(token) => set({ token })}
          />
        )}
        {shape.signingSecret && (
          <SecretField
            key={`signing-${draft.type}`}
            label={t('notificationSettings.channels.form.signingSecret')}
            stored={storedSecret('signingSecret')}
            hint={t('notificationSettings.channels.form.signingSecretHint')}
            onChange={(signingSecret) => set({ signingSecret })}
          />
        )}
        {shape.recipients && (
          <Field label={t(`notificationSettings.channels.form.${recipientsLabel}`)} hint={recipientsHint} error={err('recipients')} required={!storedRecipients.length}>
            <TextArea mono rows={3} value={draft.recipients} spellCheck={false} onChange={(e) => set({ recipients: e.target.value })} />
          </Field>
        )}
        {shape.smtp && <SmtpFields draft={draft} set={set} err={err} passwordStored={storedSecret('token')} />}
        {shape.providerTemplate && (
          <Field label={t('notificationSettings.channels.form.providerTemplate')} hint={t('notificationSettings.channels.form.providerTemplateHint')}>
            <TextInput value={draft.providerTemplate} onChange={(e) => set({ providerTemplate: e.target.value })} />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('notificationSettings.channels.form.minSeverity')}>
            <Select value={draft.minSeverity} onChange={(e) => set({ minSeverity: e.target.value as MinSeverity })}>
              <option value="WARN">{t('notificationSettings.severity.WARN')}</option>
              <option value="DOWN">{t('notificationSettings.severity.DOWN')}</option>
            </Select>
          </Field>
          <Field label={t('notificationSettings.channels.form.locale')}>
            <Select value={draft.locale} onChange={(e) => set({ locale: e.target.value as MessageLocale })}>
              <option value="en">{t('notificationSettings.locales.en')}</option>
              <option value="pt-BR">{t('notificationSettings.locales.pt-BR')}</option>
            </Select>
          </Field>
        </div>
        <GroupScope
          legend={t('notificationSettings.channels.form.groups')}
          groups={groups}
          all={draft.allGroups}
          selected={draft.groupIds}
          error={err('groupIds')}
          onChange={({ all, selected }) => set({ allGroups: all, groupIds: selected })}
        />
        <Switch
          label={t('notificationSettings.channels.form.enabled')}
          description={t('notificationSettings.channels.form.enabledHint')}
          checked={draft.enabled}
          onCheckedChange={(enabled) => set({ enabled })}
        />
      </form>
    </Dialog>
  );
}

function SecretField({ label, stored, hint, error, onChange }: { label: string; stored: boolean; hint?: string; error?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-1" data-invalid={error ? 'true' : undefined}>
      <SecretInput label={label} stored={stored} onChange={onChange} />
      {hint && <p className="m-0 text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {error}
        </p>
      )}
    </div>
  );
}

interface SmtpFieldsProps {
  draft: ChannelDraft;
  set: (patch: Partial<ChannelDraft>) => void;
  err: (field: keyof ChannelErrors) => string | undefined;
  passwordStored: boolean;
}

function SmtpFields({ draft, set, err, passwordStored }: SmtpFieldsProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend className="section-label mb-2 p-0">{t('notificationSettings.channels.form.smtpTitle')}</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('notificationSettings.channels.form.smtpHost')} error={err('smtpHost')} required className="sm:col-span-2">
          <TextInput value={draft.smtpHost} spellCheck={false} placeholder="smtp.example.com" onChange={(e) => set({ smtpHost: e.target.value })} />
        </Field>
        <Field label={t('notificationSettings.channels.form.smtpPort')} hint={t('notificationSettings.channels.form.smtpPortHint')} error={err('smtpPort')}>
          <TextInput value={draft.smtpPort} inputMode="numeric" onChange={(e) => set({ smtpPort: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('notificationSettings.channels.form.smtpSecurity')}>
          <Select value={draft.smtpSecurity} onChange={(e) => set({ smtpSecurity: e.target.value as SmtpSecurity })}>
            {(['STARTTLS', 'TLS', 'NONE'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`notificationSettings.channels.form.security.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('notificationSettings.channels.form.smtpUsername')}>
          <TextInput value={draft.smtpUsername} autoComplete="off" spellCheck={false} onChange={(e) => set({ smtpUsername: e.target.value })} />
        </Field>
      </div>
      <SecretField
        label={t('notificationSettings.channels.form.smtpPassword')}
        stored={passwordStored}
        hint={passwordStored ? t('notificationSettings.channels.form.secretStored') : undefined}
        onChange={(token) => set({ token })}
      />
      <Field label={t('notificationSettings.channels.form.smtpFrom')} error={err('smtpFrom')} required>
        <TextInput type="email" value={draft.smtpFrom} placeholder="orbit@example.com" onChange={(e) => set({ smtpFrom: e.target.value })} />
      </Field>
    </fieldset>
  );
}
