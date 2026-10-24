import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Field, SegmentedControl, TextInput } from '@/shared/ui';
import { VARIABLE_NAME, type Variable, type VariableInput, type VariableKind } from './variablesApi';

export interface VariableDialogProps {
  /** null creates a variable. */
  variable: Variable | null;
  saving: boolean;
  onSave: (input: VariableInput) => void;
  onClose: () => void;
}

/** Add or edit one variable; a secret is typed once and never read back. */
export function VariableDialog({ variable, saving, onSave, onClose }: VariableDialogProps) {
  const { t } = useTranslation();
  const formId = useId();
  const [name, setName] = useState(variable?.name ?? '');
  const [kind, setKind] = useState<VariableKind>(variable?.kind ?? 'var');
  const [value, setValue] = useState(variable && variable.kind === 'var' ? variable.value : '');
  const [description, setDescription] = useState(variable?.description ?? '');
  const [touched, setTouched] = useState(false);
  const nameError = touched && !VARIABLE_NAME.test(name) ? t('settingsHub.variables.nameInvalid') : undefined;
  const keepsSecret = variable?.kind === 'vault' && kind === 'vault';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!VARIABLE_NAME.test(name)) return;
    onSave({ name, kind, value: kind === 'vault' && keepsSecret && value === '' ? null : value, description });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={variable ? t('settingsHub.variables.edit') : t('settingsHub.variables.add')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('settingsHub.variables.cancel')}
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={saving}>
            {t('settingsHub.variables.save')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label={t('settingsHub.variables.name')} hint={t('settingsHub.variables.nameHint')} error={nameError} required>
          <TextInput className="font-mono" value={name} maxLength={64} disabled={Boolean(variable)} onChange={(e) => setName(e.target.value.trim())} onBlur={() => setTouched(true)} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="text-sm font-medium text-muted">
            {t('settingsHub.variables.kind')}
          </span>
          <SegmentedControl
            label={t('settingsHub.variables.kind')}
            value={kind}
            onChange={setKind}
            options={(['var', 'vault'] as const).map((k) => ({ value: k, label: t(`settingsHub.variables.kinds.${k}`) }))}
            className="self-start"
          />
        </div>
        {kind === 'vault' ? (
          <Field label={t('settingsHub.variables.secretValue')} hint={t('settingsHub.variables.secretKeep')} required={!keepsSecret}>
            <TextInput type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        ) : (
          <Field label={t('settingsHub.variables.value')}>
            <TextInput className="font-mono" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        )}
        <Field label={t('settingsHub.variables.description')}>
          <TextInput value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
