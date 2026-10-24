import { useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LAYOUT_TEMPLATES, type LayoutTemplate } from '@/domains/workspace/layout/templates';
import { Button, Dialog, Field, TextInput } from '@/shared/ui';

export interface CreateLayoutDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, template: LayoutTemplate['id']) => void;
}

/** Asks for a name and a starting template before a wall layout exists (FE-11, FE-16). */
export function CreateLayoutDialog({ open, onClose, onCreate }: CreateLayoutDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<LayoutTemplate['id']>('noc');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName('');
    setError(null);
    setTemplate('noc');
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t('settingsHub.layouts.createNameRequired'));
      nameRef.current?.focus();
      return;
    }
    onCreate(name.trim(), template);
    close();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('settingsHub.layouts.createTitle')}
      initialFocus={nameRef}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t('settingsHub.layouts.cancel')}
          </Button>
          <Button variant="primary" type="submit" form={formId}>
            {t('settingsHub.layouts.create')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label={t('settingsHub.layouts.createName')} hint={t('settingsHub.layouts.createNameHint')} error={error ?? undefined} required>
          <TextInput
            ref={nameRef}
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
          />
        </Field>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-medium text-muted">{t('settingsHub.layouts.createTemplate')}</legend>
          {LAYOUT_TEMPLATES.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-s1 p-3 transition-colors duration-120 hover:border-line-2 has-checked:border-accent has-checked:bg-s2"
            >
              <input
                type="radio"
                name={`${formId}-template`}
                value={item.id}
                checked={template === item.id}
                onChange={() => setTemplate(item.id)}
                className="mt-0.5 accent-accent"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-base font-medium text-text">{t(`settingsHub.templates.${item.id}.name`)}</span>
                <span className="text-sm text-muted">{t(`settingsHub.templates.${item.id}.description`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </form>
    </Dialog>
  );
}
