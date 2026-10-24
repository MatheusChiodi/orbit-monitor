import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Dialog, Field, SegmentedControl, TextArea, TextInput } from '@/shared/ui';
import type { LocalizedText, MessageLocale, Template } from '../api/notificationsApi';
import type messages from '../locales/en.json';
import { errorMessage, useNotifications } from '../model/queries';

const LOCALES: readonly MessageLocale[] = ['en', 'pt-BR'];

function useLocaleOptions() {
  const { t } = useTranslation();
  return LOCALES.map((value) => ({ value, label: t(`notificationSettings.locales.${value}`) }));
}

type TemplateNames = (typeof messages)['templates']['names'];

/** Friendly event name; unknown ids (newer backend) fall back to the id itself. */
export function templateName(t: TFunction, id: string): string {
  const [group, event] = id.split('.') as [keyof TemplateNames, string];
  const names: Record<string, string> | undefined = t('notificationSettings.templates.names', { returnObjects: true })[group];
  return names?.[event] ?? id;
}

export interface TemplateEditDialogProps {
  template: Template | null;
  variables: readonly string[];
  onClose: () => void;
  onSaved: () => void;
}

/** Edit the subject and message of one event, per language. */
export function TemplateEditDialog(props: TemplateEditDialogProps) {
  return props.template ? <TemplateEditForm key={props.template.id} {...props} template={props.template} /> : null;
}

function TemplateEditForm({ template, variables, onClose, onSaved }: TemplateEditDialogProps & { template: Template }) {
  const { t, i18n } = useTranslation();
  const { api } = useNotifications();
  const options = useLocaleOptions();
  const [locale, setLocale] = useState<MessageLocale>(i18n.language === 'pt-BR' ? 'pt-BR' : 'en');
  const [title, setTitle] = useState<LocalizedText>(template.title);
  const [text, setText] = useState<LocalizedText>(template.text);
  const name = templateName(t, template.id);

  const save = useMutation({
    mutationFn: () => {
      // A language left untouched on a default template keeps following the built-in text.
      const langs = LOCALES.filter((l) => template.custom || title[l] !== template.title[l] || text[l] !== template.text[l]);
      const pick = (edited: LocalizedText): LocalizedText => Object.fromEntries(langs.map((l) => [l, edited[l] ?? '']));
      return api.saveTemplate(template.id, { title: pick(title), text: pick(text) });
    },
    onSuccess: onSaved,
  });

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={t('notificationSettings.templates.form.editTitle', { name })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('notificationSettings.cancel')}
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            {t('notificationSettings.templates.form.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {save.isError && (
          <p role="alert" className="m-0 text-sm text-down-text">
            {t('notificationSettings.templates.saveFailed', { message: errorMessage(save.error) })}
          </p>
        )}
        <SegmentedControl label={t('notificationSettings.templates.form.language')} options={options} value={locale} onChange={setLocale} />
        <Field label={t('notificationSettings.templates.form.subject')}>
          <TextInput value={title[locale] ?? ''} onChange={(e) => setTitle((v) => ({ ...v, [locale]: e.target.value }))} />
        </Field>
        <Field label={t('notificationSettings.templates.form.body')}>
          <TextArea rows={5} value={text[locale] ?? ''} onChange={(e) => setText((v) => ({ ...v, [locale]: e.target.value }))} />
        </Field>
        {variables.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="section-label">{t('notificationSettings.templates.form.variables')}</span>
            <p className="m-0 text-xs text-muted">{t('notificationSettings.templates.form.variablesHint', { example: '{{monitor}}', interpolation: { escapeValue: false } })}</p>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {variables.map((v) => (
                <li key={v}>
                  <Badge mono>{`{{${v}}}`}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/** The saved message rendered for a sample incident, masked like real deliveries. */
export function TemplatePreviewDialog({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { api } = useNotifications();
  const options = useLocaleOptions();
  const [locale, setLocale] = useState<MessageLocale>(i18n.language === 'pt-BR' ? 'pt-BR' : 'en');
  const preview = useQuery({
    queryKey: ['notifications', 'preview', template?.id, locale],
    queryFn: () => api.previewTemplate(template!.id, locale),
    enabled: template !== null,
    gcTime: 0,
  });
  return (
    <Dialog
      open={template !== null}
      onClose={onClose}
      title={t('notificationSettings.templates.previewTitle', { name: template ? templateName(t, template.id) : '' })}
      description={t('notificationSettings.templates.previewHint')}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('notificationSettings.templates.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl label={t('notificationSettings.templates.form.language')} options={options} value={locale} onChange={setLocale} />
        {preview.isError ? (
          <p role="alert" className="m-0 text-sm text-down-text">
            {t('notificationSettings.templates.previewFailed', { message: errorMessage(preview.error) })}
          </p>
        ) : (
          <div aria-live="polite" aria-busy={preview.isPending} className="flex min-h-24 flex-col gap-2 rounded-md border border-line bg-s2 p-4">
            {preview.data && (
              <>
                <p className="m-0 font-semibold text-text">{preview.data.title}</p>
                <p className="m-0 whitespace-pre-wrap text-sm text-muted">{preview.data.text}</p>
              </>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
