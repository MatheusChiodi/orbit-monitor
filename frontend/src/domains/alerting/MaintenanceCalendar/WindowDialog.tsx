import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Group, MonitorView } from '@/shared/api/types';
import { formatTime } from '@/shared/format';
import { currentLocale, type Locale } from '@/shared/i18n/i18n';
import { safeText } from '@/shared/privacy/redact';
import { Button, Dialog, Field, SegmentedControl, Select, TextArea, TextInput } from '@/shared/ui';
import { fromLocalInput, toLocalInput } from './weekGrid';

/** What the form saves: a one-off window (start/end) or a recurring one (cron + duration). */
export interface WindowDraft {
  /** Present when an existing window is edited. */
  id?: string;
  /** Group or monitor id. */
  target: string;
  title: string;
  start: string;
  end: string;
  cron?: string;
  durationMinutes?: number;
  /** Present only when the operator wrote one. */
  reason?: string;
}

/** @deprecated use `WindowDraft`. */
export type NewMaintenanceWindow = WindowDraft;

export type MaintenanceTargetMonitor = Pick<MonitorView, 'id' | 'name' | 'type'>;

export interface WindowDialogProps {
  /** Range to start from (drag selection or the next full hour). */
  initial: { start: string; end: string };
  /** The window being edited; absent for a new one. */
  editing?: WindowDraft;
  groups: readonly Pick<Group, 'id' | 'name'>[];
  monitors?: readonly MaintenanceTargetMonitor[];
  onSave: (window: WindowDraft) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const MAX_MINUTES = 7 * 24 * 60;
const CRON = /^\S+(\s+\S+){4,5}$/;

export function weekday(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace(/\.$/, '');
}

/** "Wed 09:00 – 11:00" (the weekday of the start; the end keeps only its time). */
export function rangeText(start: Date, end: Date, locale: Locale): string {
  return `${weekday(start, locale)} ${formatTime(start)} – ${formatTime(end)}`;
}

/** FE-41: the form behind "New window", the drag shortcut and a click on an existing window. Mounted only while open. */
export function WindowDialog({ initial, editing, groups, monitors = [], onSave, onDelete, onClose }: WindowDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const targets = monitors.filter((m) => (m.type as string) !== 'SELF');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [target, setTarget] = useState(editing?.target ?? groups[0]?.id ?? targets[0]?.id ?? '');
  const [repeats, setRepeats] = useState<'once' | 'repeats'>(editing?.cron ? 'repeats' : 'once');
  const [start, setStart] = useState(() => toLocalInput(new Date(editing?.start ?? initial.start)));
  const [end, setEnd] = useState(() => toLocalInput(new Date(editing?.end ?? initial.end)));
  const [cron, setCron] = useState(editing?.cron ?? '');
  const [duration, setDuration] = useState(String(editing?.durationMinutes ?? 60));
  const [reason, setReason] = useState(editing?.reason ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const from = fromLocalInput(start);
  const to = fromLocalInput(end);
  const minutes = Number(duration);
  const recurring = repeats === 'repeats';
  const errors = {
    title: title.trim() ? null : t('ops.maintenance.nameRequired'),
    target: target ? null : t('ops.maintenance.targetRequired'),
    end: recurring || (from && to && to > from) ? null : t('ops.maintenance.endAfterStart'),
    cron: !recurring || CRON.test(cron.trim()) ? null : t('ops.maintenance.cronRequired'),
    duration: !recurring || (Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_MINUTES) ? null : t('ops.maintenance.durationRange'),
  };
  const show = (error: string | null) => (submitted ? error : null);

  function submit() {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || !from || !to) return;
    const reasonText = reason.trim();
    onSave({
      ...(editing?.id ? { id: editing.id } : {}),
      target,
      title: title.trim(),
      start: from.toISOString(),
      end: to.toISOString(),
      ...(recurring ? { cron: cron.trim(), durationMinutes: minutes } : {}),
      ...(reasonText ? { reason: reasonText } : {}),
    });
    onClose();
  }

  if (confirmingDelete && editing?.id && onDelete) {
    const id = editing.id;
    return (
      <Dialog
        open
        size="sm"
        onClose={() => setConfirmingDelete(false)}
        title={t('ops.maintenance.deleteTitle', { name: safeText(editing.title) })}
        description={t('ops.maintenance.deleteBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              {t('ops.maintenance.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onDelete(id);
                onClose();
              }}
            >
              {t('ops.maintenance.deleteConfirm')}
            </Button>
          </>
        }
      />
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(editing ? 'ops.maintenance.editTitle' : 'ops.maintenance.dialogTitle')}
      description={!recurring && from && to && to > from ? rangeText(from, to, locale) : undefined}
      footer={
        <>
          {editing?.id && onDelete && (
            <Button variant="danger" className="mr-auto" onClick={() => setConfirmingDelete(true)}>
              {t('ops.maintenance.delete')}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('ops.maintenance.cancel')}
          </Button>
          <Button variant="primary" onClick={submit}>
            {t(editing ? 'ops.maintenance.save' : 'ops.maintenance.create')}
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
        <Field label={t('ops.maintenance.targets')} required error={show(errors.target)}>
          <Select value={target} placeholder={groups.length + targets.length ? undefined : t('ops.maintenance.groupRequired')} onChange={(e) => setTarget(e.target.value)}>
            {groups.length > 0 && (
              <optgroup label={t('ops.maintenance.groupsLabel')}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {safeText(g.name)}
                  </option>
                ))}
              </optgroup>
            )}
            {targets.length > 0 && (
              <optgroup label={t('ops.maintenance.monitorsLabel')}>
                {targets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {safeText(m.name)}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </Field>
        <SegmentedControl
          label={t('ops.maintenance.schedule')}
          value={repeats}
          onChange={setRepeats}
          options={[
            { value: 'once', label: t('ops.maintenance.once') },
            { value: 'repeats', label: t('ops.maintenance.repeats') },
          ]}
        />
        {recurring ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('ops.maintenance.cron')} hint={t('ops.maintenance.cronHint')} required error={show(errors.cron)}>
              <TextInput value={cron} placeholder="0 2 * * 0" className="font-mono" onChange={(e) => setCron(e.target.value)} />
            </Field>
            <Field label={t('ops.maintenance.duration')} required error={show(errors.duration)}>
              <TextInput type="number" min={1} max={MAX_MINUTES} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('ops.maintenance.start')} required>
              <TextInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label={t('ops.maintenance.end')} required error={show(errors.end)}>
              <TextInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
        )}
        <Field label={t('ops.maintenance.reason')} hint={t('ops.maintenance.reasonHint')}>
          <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
