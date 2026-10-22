import { useId, useState, type KeyboardEvent } from 'react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { AccessMode, Group } from '@/shared/api/types';
import { formatTime } from '@/shared/format';
import { currentLocale, type Locale } from '@/shared/i18n/i18n';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { safeText } from '@/shared/privacy/redact';
import { Button, INPUT_CLASS, LABEL_CLASS, SELECT_CLASS } from '@/shared/ui';
import { SLOTS_PER_DAY, slotRange, slotStart, type SlotRef } from './slots';

/** Item of `orbit.maintenance.json`. */
export interface MaintenanceWindow {
  id: string;
  groupId: string;
  title: string;
  start: string;
  end: string;
}

export interface NewMaintenanceWindow {
  groupId: string;
  title: string;
  start: string;
  end: string;
}

export interface MaintenanceCalendarProps {
  windows: readonly MaintenanceWindow[];
  groups: readonly Group[];
  weekStart: Date;
  mode: AccessMode;
  onCreate: (window: NewMaintenanceWindow) => void;
}

function weekday(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace(/\.$/, '');
}

function cellLabel(weekStart: Date, ref: SlotRef, locale: Locale): string {
  const date = slotStart(weekStart, ref.day * SLOTS_PER_DAY + ref.slot);
  return `${weekday(date, locale)} ${formatTime(date)}`;
}

/** FE-41: drag (or Enter + Shift+arrows) across a week grid to create a maintenance window. */
export function MaintenanceCalendar({ windows, groups, weekStart, mode, onCreate }: MaintenanceCalendarProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const dialogMotion = useMotionPreset('dialog');
  const ids = { title: useId(), group: useId() };
  const editable = mode === 'edit';
  const [anchor, setAnchor] = useState<SlotRef | null>(null);
  const [focus, setFocus] = useState<SlotRef | null>(null);
  const [draft, setDraft] = useState<{ start: string; end: string } | null>(null);
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');

  function finish(a: SlotRef, b: SlotRef) {
    if (!editable) return;
    setDraft(slotRange(weekStart, a, b));
    setAnchor(null);
    setFocus(null);
  }

  function onCellKey(event: KeyboardEvent<HTMLDivElement>, ref: SlotRef) {
    if (!editable) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (anchor && focus) finish(anchor, focus);
      else {
        setAnchor(ref);
        setFocus(ref);
      }
    } else if (anchor && focus && event.shiftKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setFocus({ day: focus.day, slot: Math.min(SLOTS_PER_DAY - 1, Math.max(0, focus.slot + delta)) });
    } else if (event.key === 'Escape') {
      setAnchor(null);
      setFocus(null);
    }
  }

  const days = Array.from({ length: 7 }, (_, day) => day);
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const rangeText = (start: string, end: string) => {
    const s = new Date(start);
    return `${weekday(s, locale)} ${formatTime(s)} – ${formatTime(end)}`;
  };

  return (
    <div className="flex flex-col gap-[0.8rem]">
      <p className="m-0 text-[0.8rem] text-muted">{t('maintenance.note')}</p>
      {windows.length === 0 ? (
        <p className="m-0 text-[0.85rem] text-muted">{t('maintenance.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-wrap gap-[0.4rem] p-0">
          {windows.map((w) => {
            const s = new Date(w.start);
            const label = `${safeText(w.title)} · ${safeText(groupName.get(w.groupId) ?? w.groupId)} · ${weekday(s, locale)} ${formatTime(s)}–${formatTime(w.end)}`;
            return (
              <li key={w.id}>
                <Button variant="neutral">{label}</Button>
              </li>
            );
          })}
        </ul>
      )}

      <div role="grid" aria-label={t('maintenance.calendar')} className="max-h-[28rem] overflow-auto rounded-[0.6rem] border border-line">
        {Array.from({ length: SLOTS_PER_DAY }, (_, slot) => (
          <div role="row" key={slot} className="grid grid-cols-7">
            {days.map((day) => {
              const ref = { day, slot };
              const selected =
                anchor && focus && day === anchor.day && slot >= Math.min(anchor.slot, focus.slot) && slot <= Math.max(anchor.slot, focus.slot);
              return (
                <div
                  key={day}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={cellLabel(weekStart, ref, locale)}
                  aria-selected={Boolean(selected)}
                  onPointerDown={() => {
                    if (!editable) return;
                    setAnchor(ref);
                    setFocus(ref);
                  }}
                  onPointerEnter={() => {
                    if (anchor) setFocus({ day: anchor.day, slot });
                  }}
                  onPointerUp={() => {
                    if (anchor) finish(anchor, focus ?? ref);
                  }}
                  onKeyDown={(e) => onCellKey(e, ref)}
                  className={`h-[0.9rem] border-r border-b border-line ${selected ? 'bg-info/30' : ''}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {draft && editable && (
        <m.div
          role="dialog"
          aria-label={t('maintenance.newWindow')}
          initial={dialogMotion.initial}
          animate={dialogMotion.animate}
          transition={dialogMotion.transition}
          className="flex flex-col gap-[0.6rem] rounded-[0.9rem] border border-line-2 bg-s1 p-[1rem]"
        >
          <h2 className="section-label m-0">{t('maintenance.newWindow')}</h2>
          <p className="m-0 font-mono text-[0.85rem]">{rangeText(draft.start, draft.end)}</p>
          <div className={LABEL_CLASS}>
            <label htmlFor={ids.title}>{t('maintenance.title')}</label>
            <input id={ids.title} className={INPUT_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className={LABEL_CLASS}>
            <label htmlFor={ids.group}>{t('maintenance.group')}</label>
            <select id={ids.group} className={SELECT_CLASS} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Button
              variant="primary"
              onClick={() => {
                if (!title.trim() || !groupId) return;
                onCreate({ groupId, title: title.trim(), start: draft.start, end: draft.end });
                setDraft(null);
                setTitle('');
              }}
            >
              {t('maintenance.create')}
            </Button>
          </div>
        </m.div>
      )}
    </div>
  );
}
