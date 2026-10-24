import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Field, Select, TextArea, TextInput } from '@/shared/ui';
import type { OnCallSchedule, ScheduleRequest } from '../api/notificationsApi';
import { newId } from '../model/channelForm';
import { errorMessage, useNotifications } from '../model/queries';
import { fromLocalInput, toLocalInput } from '../model/time';

const PRESETS = [8, 12, 24, 48, 168] as const;

export function shiftLabel(t: TFunction, hours: number): string {
  return hours % 24 === 0 ? t('notificationSettings.oncall.shiftDays', { count: hours / 24 }) : t('notificationSettings.oncall.shift', { count: hours });
}

interface ScheduleDraft {
  name: string;
  people: string;
  start: string;
  preset: string;
  custom: string;
}

type ScheduleErrors = Partial<Record<'name' | 'people' | 'start' | 'shift', true>>;

function hoursOf(d: ScheduleDraft): number {
  return Number(d.preset === 'custom' ? d.custom : d.preset);
}

export function validateSchedule(d: ScheduleDraft): ScheduleErrors {
  const errors: ScheduleErrors = {};
  if (!d.name.trim()) errors.name = true;
  if (!d.people.split('\n').some((p) => p.trim())) errors.people = true;
  if (!fromLocalInput(d.start)) errors.start = true;
  const hours = hoursOf(d);
  if (!Number.isInteger(hours) || hours < 1 || hours > 744) errors.shift = true;
  return errors;
}

export interface ScheduleDialogProps {
  open: boolean;
  schedule?: OnCallSchedule;
  takenIds: readonly string[];
  onClose: () => void;
  onSaved: () => void;
}

/** Add or edit an on-call rotation: people in order, start and shift length. Shift swaps are kept as they are. */
export function ScheduleDialog(props: ScheduleDialogProps) {
  return props.open ? <ScheduleForm key={props.schedule?.id ?? 'new'} {...props} /> : null;
}

function ScheduleForm({ schedule, takenIds, onClose, onSaved }: ScheduleDialogProps) {
  const { t } = useTranslation();
  const { api } = useNotifications();
  const [draft, setDraft] = useState<ScheduleDraft>(() => {
    const hours = schedule?.shiftHours ?? 24;
    const preset = (PRESETS as readonly number[]).includes(hours) ? String(hours) : 'custom';
    return { name: schedule?.name ?? '', people: (schedule?.people ?? []).join('\n'), start: toLocalInput(schedule?.start), preset, custom: String(hours) };
  });
  const [errors, setErrors] = useState<ScheduleErrors>({});
  const set = (patch: Partial<ScheduleDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const overrides = schedule?.overrides ?? [];

  const save = useMutation({
    mutationFn: () => {
      const body: ScheduleRequest = {
        name: draft.name.trim(),
        people: draft.people.split('\n').map((p) => p.trim()).filter(Boolean),
        start: fromLocalInput(draft.start)!,
        shiftHours: hoursOf(draft),
        overrides,
      };
      return api.saveSchedule(schedule?.id ?? newId(draft.name, takenIds), body);
    },
    onSuccess: onSaved,
  });
  const submit = () => {
    const found = validateSchedule(draft);
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  };
  const err = (field: keyof ScheduleErrors) => (errors[field] ? t(`notificationSettings.oncall.errors.${field}`) : undefined);

  return (
    <Dialog
      open
      onClose={onClose}
      title={schedule ? t('notificationSettings.oncall.edit') : t('notificationSettings.oncall.add')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('notificationSettings.cancel')}
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={submit}>
            {t('notificationSettings.oncall.form.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {save.isError && (
          <p role="alert" className="m-0 text-sm text-down-text">
            {t('notificationSettings.oncall.saveFailed', { message: errorMessage(save.error) })}
          </p>
        )}
        <Field label={t('notificationSettings.oncall.form.name')} error={err('name')} required>
          <TextInput value={draft.name} placeholder={t('notificationSettings.oncall.form.namePlaceholder')} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label={t('notificationSettings.oncall.form.people')} hint={t('notificationSettings.oncall.form.peopleHint')} error={err('people')} required>
          <TextArea rows={4} value={draft.people} onChange={(e) => set({ people: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('notificationSettings.oncall.form.start')} hint={t('notificationSettings.oncall.form.startHint')} error={err('start')} required>
            <TextInput type="datetime-local" className="font-mono" value={draft.start} onChange={(e) => set({ start: e.target.value })} />
          </Field>
          <div className="flex flex-col gap-4">
            <Field label={t('notificationSettings.oncall.form.shift')} error={draft.preset === 'custom' ? undefined : err('shift')}>
              <Select value={draft.preset} onChange={(e) => set({ preset: e.target.value })}>
                {PRESETS.map((h) => (
                  <option key={h} value={String(h)}>
                    {shiftLabel(t, h)}
                  </option>
                ))}
                <option value="custom">{t('notificationSettings.oncall.form.custom')}</option>
              </Select>
            </Field>
            {draft.preset === 'custom' && (
              <Field label={t('notificationSettings.oncall.form.custom')} error={err('shift')}>
                <TextInput inputMode="numeric" className="font-mono" value={draft.custom} onChange={(e) => set({ custom: e.target.value })} />
              </Field>
            )}
          </div>
        </div>
        {overrides.length > 0 && <p className="m-0 text-xs text-muted">{t('notificationSettings.oncall.form.overridesKept', { count: overrides.length })}</p>}
      </div>
    </Dialog>
  );
}
