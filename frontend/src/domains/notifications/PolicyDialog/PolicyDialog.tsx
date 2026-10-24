import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Dialog, Field, IconButton, IconPlus, IconTrash, Select, TextInput } from '@/shared/ui';
import type { Channel, EscalationPolicy, GroupRef, OnCallSchedule } from '../api/notificationsApi';
import { GroupScope } from '../GroupScope';
import { newId } from '../model/channelForm';
import { draftFromPolicy, hasErrors, newStep, nextDelay, toPolicyRequest, validatePolicy, type PolicyDraft, type PolicyErrors, type StepDraft } from '../model/policyForm';
import { errorMessage, useNotifications } from '../model/queries';

export interface PolicyDialogProps {
  open: boolean;
  policy?: EscalationPolicy;
  channels: readonly Channel[];
  schedules: readonly OnCallSchedule[];
  groups: readonly GroupRef[];
  takenIds: readonly string[];
  onClose: () => void;
  onSaved: () => void;
}

/** Add or edit an escalation policy: timed steps, each notifying channels and naming the on-call person. */
export function PolicyDialog(props: PolicyDialogProps) {
  return props.open ? <PolicyForm key={props.policy?.id ?? 'new'} {...props} /> : null;
}

function PolicyForm({ policy, channels, schedules, groups, takenIds, onClose, onSaved }: PolicyDialogProps) {
  const { t } = useTranslation();
  const { api } = useNotifications();
  const [draft, setDraft] = useState<PolicyDraft>(() => draftFromPolicy(policy));
  const [errors, setErrors] = useState<PolicyErrors>({});
  const set = (patch: Partial<PolicyDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setStep = (index: number, patch: Partial<StepDraft>) =>
    setDraft((d) => ({ ...d, steps: d.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));

  const save = useMutation({
    mutationFn: () => api.savePolicy(policy?.id ?? newId(draft.name, takenIds), toPolicyRequest(draft)),
    onSuccess: onSaved,
  });
  const submit = () => {
    const found = validatePolicy(draft);
    setErrors(found);
    if (!hasErrors(found)) save.mutate();
  };
  const msg = (key: string | undefined) => (key ? t(`notificationSettings.escalation.errors.${key}` as 'notificationSettings.escalation.errors.name') : undefined);

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={policy ? t('notificationSettings.escalation.edit') : t('notificationSettings.escalation.add')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('notificationSettings.cancel')}
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={submit}>
            {t('notificationSettings.escalation.form.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {save.isError && (
          <p role="alert" className="m-0 text-sm text-down-text">
            {t('notificationSettings.escalation.saveFailed', { message: errorMessage(save.error) })}
          </p>
        )}
        <Field label={t('notificationSettings.escalation.form.name')} error={msg(errors.name)} required>
          <TextInput value={draft.name} placeholder={t('notificationSettings.escalation.form.namePlaceholder')} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <GroupScope
          legend={t('notificationSettings.escalation.form.groups')}
          groups={groups}
          all={draft.allGroups}
          selected={draft.groupIds}
          error={msg(errors.groups)}
          onChange={({ all, selected }) => set({ allGroups: all, groupIds: selected })}
        />
        <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-medium text-text">{t('notificationSettings.escalation.form.steps')}</legend>
          <p className="m-0 text-xs text-muted">{t('notificationSettings.escalation.form.stepsHint')}</p>
          {channels.length === 0 && <p className="m-0 text-sm text-warn-text">{t('notificationSettings.escalation.form.noChannels')}</p>}
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {draft.steps.map((step, i) => (
              <StepEditor
                key={step.key}
                index={i}
                step={step}
                channels={channels}
                schedules={schedules}
                errors={errors.step?.[i]}
                canRemove={draft.steps.length > 1}
                onChange={(patch) => setStep(i, patch)}
                onRemove={() => set({ steps: draft.steps.filter((_, j) => j !== i) })}
              />
            ))}
          </ol>
          {msg(errors.steps) && (
            <p role="alert" className="m-0 text-sm text-down-text">
              {msg(errors.steps)}
            </p>
          )}
          <div>
            <Button variant="secondary" size="sm" onClick={() => set({ steps: [...draft.steps, newStep(nextDelay(draft.steps))] })}>
              <IconPlus />
              {t('notificationSettings.escalation.form.addStep')}
            </Button>
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}

interface StepEditorProps {
  index: number;
  step: StepDraft;
  channels: readonly Channel[];
  schedules: readonly OnCallSchedule[];
  errors?: { after?: string; target?: string };
  canRemove: boolean;
  onChange: (patch: Partial<StepDraft>) => void;
  onRemove: () => void;
}

function StepEditor({ index, step, channels, schedules, errors, canRemove, onChange, onRemove }: StepEditorProps) {
  const { t } = useTranslation();
  const n = index + 1;
  const toggle = (id: string, on: boolean) => onChange({ channelIds: on ? [...step.channelIds, id] : step.channelIds.filter((c) => c !== id) });
  return (
    <li className="flex flex-col gap-3 rounded-md border border-line bg-s2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="section-label">{t('notificationSettings.escalation.form.stepTitle', { n })}</span>
        {canRemove && <IconButton label={t('notificationSettings.escalation.form.removeStep', { n })} icon={IconTrash} size="sm" onClick={onRemove} />}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('notificationSettings.escalation.form.after')} error={errors?.after ? t('notificationSettings.escalation.errors.after') : undefined}>
          <TextInput inputMode="numeric" className="font-mono" value={step.after} onChange={(e) => onChange({ after: e.target.value })} />
        </Field>
        <Field label={t('notificationSettings.escalation.form.stepName')} className="sm:col-span-2">
          <TextInput value={step.name} placeholder={t('notificationSettings.escalation.form.stepNamePlaceholder')} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
      </div>
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-medium text-text">{t('notificationSettings.escalation.form.channels')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {channels.map((c) => (
            <Checkbox
              key={c.id}
              label={c.name}
              description={t(`notificationSettings.types.${c.type}`)}
              checked={step.channelIds.includes(c.id)}
              onChange={(e) => toggle(c.id, e.target.checked)}
            />
          ))}
        </div>
        {errors?.target && (
          <p role="alert" className="m-0 text-sm text-down-text">
            {t('notificationSettings.escalation.errors.target')}
          </p>
        )}
      </fieldset>
      {schedules.length > 0 && (
        <Field label={t('notificationSettings.escalation.form.onCall')}>
          <Select value={step.onCallScheduleId} onChange={(e) => onChange({ onCallScheduleId: e.target.value })}>
            <option value="">{t('notificationSettings.escalation.form.onCallNone')}</option>
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </li>
  );
}
