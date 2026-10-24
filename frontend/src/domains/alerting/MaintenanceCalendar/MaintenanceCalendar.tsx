import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccessMode, Group } from '@/shared/api/types';
import { formatTime } from '@/shared/format';
import { currentLocale, type Locale } from '@/shared/i18n/i18n';
import { safeText } from '@/shared/privacy/redact';
import { Button, IconButton, IconChevronLeft, IconChevronRight, IconPlus } from '@/shared/ui';
import { SLOTS_PER_DAY, slotRange, slotStart, type SlotRef } from './slots';
import { dayStart, daySegments, nextHourRange, nowMarker } from './weekGrid';
import { WindowDialog, weekday, type MaintenanceTargetMonitor, type WindowDraft } from './WindowDialog';

export type { MaintenanceTargetMonitor, NewMaintenanceWindow, WindowDraft } from './WindowDialog';

/** One block of the week: a one-off window or one occurrence of a recurring one. */
export interface MaintenanceWindow {
  id: string;
  /** Id of the `orbit.maintenance.json` item (an occurrence id adds `@start`). */
  windowId?: string;
  /** Group or monitor id. */
  target: string;
  title: string;
  start: string;
  end: string;
}

export interface MaintenanceCalendarProps {
  windows: readonly MaintenanceWindow[];
  groups: readonly Pick<Group, 'id' | 'name'>[];
  /** Monitors that can be a window's target (the built-in `SELF` check is left out). */
  monitors?: readonly MaintenanceTargetMonitor[];
  weekStart: Date;
  mode: AccessMode;
  /** New window (no `id`) or edited window (`id`). */
  onSave: (window: WindowDraft) => void;
  onDelete?: (id: string) => void;
  /** The saved settings of a window, to edit it (recurrence, reason); defaults to the block itself. */
  draftOf?: (window: MaintenanceWindow) => WindowDraft | undefined;
  /** Increment to open the "New window" form from outside (command palette). */
  newRequest?: number;
  /** Week navigation; hidden when absent. */
  onWeekChange?: (weekStart: Date) => void;
  /** Clock for the today marker (tests pass a fixed one). */
  now?: Date;
}

/** Hour axis column + 7 day columns. */
const COLUMNS = { gridTemplateColumns: '3.5rem repeat(7, minmax(2.75rem, 1fr))' };
const FIRST_VISIBLE_SLOT = 14; // 07:00

function cellLabel(weekStart: Date, ref: SlotRef, locale: Locale): string {
  const date = slotStart(weekStart, ref.day * SLOTS_PER_DAY + ref.slot);
  return `${weekday(date, locale)} ${formatTime(date)}`;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));

/**
 * FE-41: week calendar — day headers, hour axis, today marker. "New window" opens a form; dragging (or
 * Enter + Shift+arrows) across a day is a shortcut that opens the same form with that range.
 */
export function MaintenanceCalendar({
  windows,
  groups,
  monitors = [],
  weekStart,
  mode,
  onSave,
  onDelete,
  draftOf,
  newRequest = 0,
  onWeekChange,
  now: fixedNow,
}: MaintenanceCalendarProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const editable = mode === 'edit';
  const now = fixedNow ?? new Date();
  const scroller = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<SlotRef | null>(null);
  const [focus, setFocus] = useState<SlotRef | null>(null);
  const [cursor, setCursor] = useState<SlotRef>(() => ({ day: Math.max(0, nowMarker(weekStart, now)?.day ?? 0), slot: 18 }));
  const [draft, setDraft] = useState<{ start: string; end: string } | null>(null);
  const [editing, setEditing] = useState<WindowDraft | null>(null);

  useEffect(() => {
    if (newRequest > 0 && editable) setDraft(nextHourRange(new Date()));
  }, [newRequest, editable]);

  function edit(w: MaintenanceWindow) {
    if (!editable) return;
    setEditing(draftOf?.(w) ?? { id: w.windowId ?? w.id, target: w.target, title: w.title, start: w.start, end: w.end });
  }

  useEffect(() => {
    const row = scroller.current?.querySelector<HTMLElement>(`[data-slot="${FIRST_VISIBLE_SLOT}"]`);
    if (scroller.current && row) scroller.current.scrollTop = row.offsetTop - (scroller.current.querySelector<HTMLElement>('[data-header]')?.offsetHeight ?? 0);
  }, []);

  function finish(a: SlotRef, b: SlotRef) {
    if (!editable) return;
    setDraft(slotRange(weekStart, a, b));
    setAnchor(null);
    setFocus(null);
  }

  function moveTo(ref: SlotRef) {
    setCursor(ref);
    scroller.current?.querySelector<HTMLElement>(`[data-cell="${ref.day}-${ref.slot}"]`)?.focus();
  }

  function onCellKey(event: KeyboardEvent<HTMLDivElement>, ref: SlotRef) {
    const vertical = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    const horizontal = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (editable && event.key === 'Enter') {
      event.preventDefault();
      if (anchor && focus) finish(anchor, focus);
      else {
        setAnchor(ref);
        setFocus(ref);
      }
    } else if (anchor && focus && event.shiftKey && vertical) {
      event.preventDefault();
      const next = { day: anchor.day, slot: clamp(focus.slot + vertical, SLOTS_PER_DAY - 1) };
      setFocus(next);
      moveTo(next);
    } else if (vertical || horizontal) {
      event.preventDefault();
      moveTo({ day: clamp(ref.day + horizontal, 6), slot: clamp(ref.slot + vertical, SLOTS_PER_DAY - 1) });
    } else if (event.key === 'Escape') {
      setAnchor(null);
      setFocus(null);
    }
  }

  const days = Array.from({ length: 7 }, (_, day) => dayStart(weekStart, day));
  const targetName = new Map([...groups, ...monitors].map((g) => [g.id, g.name]));
  const marker = nowMarker(weekStart, now);
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const weekRange = `${dayMonth.format(days[0])} – ${dayMonth.format(days[6])}`;
  const windowText = (w: MaintenanceWindow) =>
    t('ops.maintenance.windowAt', {
      title: safeText(w.title),
      group: safeText(targetName.get(w.target) ?? w.target),
      range: `${weekday(new Date(w.start), locale)} ${formatTime(w.start)}–${formatTime(w.end)}`,
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 mr-auto text-md font-semibold text-text">{t('ops.maintenance.week', { range: weekRange })}</h2>
        {onWeekChange && (
          <span className="flex items-center gap-1">
            <IconButton label={t('screens.maintenance.previousWeek')} icon={IconChevronLeft} onClick={() => onWeekChange(dayStart(weekStart, -7))} />
            <Button variant="ghost" onClick={() => onWeekChange(dayStart(now, -((now.getDay() + 6) % 7)))}>
              {t('screens.maintenance.thisWeek')}
            </Button>
            <IconButton label={t('screens.maintenance.nextWeek')} icon={IconChevronRight} onClick={() => onWeekChange(dayStart(weekStart, 7))} />
          </span>
        )}
        {editable && (
          <Button variant="primary" onClick={() => setDraft(nextHourRange(now))}>
            <IconPlus />
            {t('ops.maintenance.newWindow')}
          </Button>
        )}
      </div>

      {windows.length === 0 ? (
        <p className="m-0 text-sm text-muted">{t('ops.maintenance.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
          {windows.map((w) => (
            <li key={w.id}>
              {editable ? (
                <button
                  type="button"
                  aria-label={t('ops.maintenance.open', { name: windowText(w) })}
                  onClick={() => edit(w)}
                  className="flex items-center gap-2 rounded-sm py-0.5 text-left text-text hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span aria-hidden className="size-2 shrink-0 rounded-sm bg-accent" />
                  {windowText(w)}
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-2 shrink-0 rounded-sm bg-accent" />
                  {windowText(w)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div ref={scroller} className="max-h-128 overflow-auto rounded-md border border-line bg-s1">
        <div role="grid" aria-label={t('maintenance.calendar')} className="min-w-max select-none sm:min-w-0">
          <div role="row" data-header className="sticky top-0 z-10 grid border-b border-line bg-s1" style={COLUMNS}>
            {/* Keeps its grid column (the hour axis); only the text is visually hidden. */}
            <span role="columnheader">
              <span className="sr-only">{t('ops.maintenance.hour')}</span>
            </span>
            {days.map((date) => {
              const today = sameDay(date, now);
              return (
                <span
                  key={date.toISOString()}
                  role="columnheader"
                  aria-current={today ? 'date' : undefined}
                  className={`flex flex-col items-center py-2 text-xs ${today ? 'font-semibold text-accent' : 'text-muted'}`}
                >
                  <span>
                    {weekday(date, locale)} {date.getDate()}
                  </span>
                  {today && <span className="sr-only">{t('ops.maintenance.today')}</span>}
                </span>
              );
            })}
          </div>
          <div role="rowgroup" className="relative">
            {Array.from({ length: SLOTS_PER_DAY }, (_, slot) => (
              <div role="row" key={slot} data-slot={slot} className="grid" style={COLUMNS}>
                <span role="rowheader" className="h-4 pr-2 text-right font-mono text-xs leading-none text-dim">
                  {slot % 2 === 0 ? formatTime(slotStart(weekStart, slot)) : <span className="sr-only">{formatTime(slotStart(weekStart, slot))}</span>}
                </span>
                {days.map((date, day) => {
                  const ref = { day, slot };
                  const selected =
                    anchor && focus && day === anchor.day && slot >= Math.min(anchor.slot, focus.slot) && slot <= Math.max(anchor.slot, focus.slot);
                  const isCursor = cursor.day === day && cursor.slot === slot;
                  return (
                    <div
                      key={date.toISOString()}
                      role="gridcell"
                      data-cell={`${day}-${slot}`}
                      tabIndex={isCursor ? 0 : -1}
                      aria-label={cellLabel(weekStart, ref, locale)}
                      aria-selected={Boolean(selected)}
                      onFocus={() => setCursor(ref)}
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
                      className={`h-4 border-l border-line focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                        slot % 2 === 0 ? 'border-t' : ''
                      } ${selected ? 'bg-accent/30' : editable ? 'hover:bg-s2' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 left-14 grid grid-cols-7">
              {days.map((date, day) => (
                <div key={date.toISOString()} className="relative">
                  {windows.flatMap((w) =>
                    daySegments(weekStart, w.start, w.end)
                      .filter((s) => s.day === day)
                      .map((s) => (
                        <div
                          key={`${w.id}-${day}`}
                          data-window={w.id}
                          onClick={() => edit(w)}
                          className={`absolute inset-x-0.5 overflow-hidden rounded-sm border-l-2 border-accent bg-accent/15 px-1 text-xs text-text ${
                            editable ? 'pointer-events-auto cursor-pointer hover:bg-accent/25' : ''
                          }`}
                          style={{ top: `${s.top}%`, height: `${s.height}%` }}
                        >
                          {s.first && <span className="block truncate">{safeText(w.title)}</span>}
                        </div>
                      )),
                  )}
                  {marker?.day === day && (
                    <div data-testid="now-marker" className="absolute inset-x-0 h-px bg-accent" style={{ top: `${marker.top}%` }}>
                      <span className="absolute -top-1 -left-1 size-2 rounded-full bg-accent" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {editable && <p className="m-0 text-xs text-dim">{t('ops.maintenance.dragHint')}</p>}

      {draft && editable && <WindowDialog initial={draft} groups={groups} monitors={monitors} onSave={onSave} onClose={() => setDraft(null)} />}
      {editing && editable && (
        <WindowDialog
          initial={{ start: editing.start, end: editing.end }}
          editing={editing}
          groups={groups}
          monitors={monitors}
          onSave={onSave}
          onDelete={onDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
