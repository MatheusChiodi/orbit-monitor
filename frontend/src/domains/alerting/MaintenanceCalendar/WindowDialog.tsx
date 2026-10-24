import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Group } from '@/shared/api/types';
import { formatTime } from '@/shared/format';
import { currentLocale, type Locale } from '@/shared/i18n/i18n';
import { Button, Dialog, Field, Select, TextArea, TextInput } from '@/shared/ui';
import { fromLocalInput, toLocalInput } from './weekGrid';

export interface NewMaintenanceWindow {
  groupId: string;
  title: string;
  start: string;
  end: string;
  /** Present only when the operator wrote one. */
  reason?: string;
}

export interface WindowDialogProps {
  /** Range to start from (drag selection or the next full hour). */
  initial: { start: string; end: string };
  groups: readonly Pick<Group, 'id' | 'name'>[];
  onCreate: (window: NewMaintenanceWindow) => void;
  onClose: () => void;
}

export function weekday(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace(/\.$/, '');
}

/** "Wed 09:00 – 11:00" (the weekday of the start; the end keeps only its time). */
export function rangeText(start: Date, end: Date, locale: Locale): string {
  return `${weekday(start, locale)} ${formatTime(start)} – ${formatTime(end)}`;
}

/** FE-41: the form behind "New window" and the drag shortcut. Mounted only while open. */
export function WindowDialog({ initial, groups, onCreate, onClose }: WindowDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [start, setStart] = useState(() => toLocalInput(new Date(initial.start)));
  const [end, setEnd] = useState(() => toLocalInput(new Date(initial.end)));
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const from = fromLocalInput(start);
  const to = fromLocalInput(end);
  const errors = {
    title: title.trim() ? null : t('ops.maintenance.nameRequired'),
    group: groupId ? null : t('ops.maintenance.groupRequired'),
    end: from && to && to > from ? null : t('ops.maintenance.endAfterStart'),
  };
  const show = (error: string | null) => (submitted ? error : null);

  function submit() {
    setSubmitted(true);
    if (errors.title || errors.group || errors.end || !from || !to) return;
    const reasonText = reason.trim();
    onCreate({ groupId, title: title.trim(), start: from.toISOString(), end: to.toISOString(), ...(reasonText ? { reason: reasonText } : {}) });
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('ops.maintenance.dialogTitle')}
      description={from && to && to > from ? rangeText(from, to, locale) : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('ops.maintenance.cancel')}
          </Button>
          <Button variant="primary" onClick={submit}>
            {t('ops.maintenance.create')}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label={t('ops.maintenance.name')} required error={show(errors.title)}>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={t('ops.maintenance.target')} required error={show(errors.group)}>
          <Select value={groupId} placeholder={groups.length ? undefined : t('ops.maintenance.groupRequired')} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('ops.maintenance.start')} required>
            <TextInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t('ops.maintenance.end')} required error={show(errors.end)}>
            <TextInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label={t('ops.maintenance.reason')} hint={t('ops.maintenance.reasonHint')}>
          <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
