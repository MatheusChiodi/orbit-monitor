import type { MaintenanceWindow, WindowDraft } from '@/domains/alerting/MaintenanceCalendar';
import type { MaintenanceItem, MaintenanceOccurrence } from '@/shared/api/consoleTypes';

/** One-off windows (start/end) go on the calendar; recurring (cron) windows are listed by the backend only. */
export function toCalendarWindows(items: readonly MaintenanceItem[]): MaintenanceWindow[] {
  return items
    .filter((item) => item.start && item.end)
    .map((item) => ({
      id: item.id,
      windowId: item.id,
      title: item.name || item.id,
      target: item.targets?.[0] ?? '',
      start: item.start!,
      end: item.end!,
    }));
}

const randomId = () => Math.random().toString(36).slice(2, 10);

/** The form's window as an `orbit.maintenance.json` item: one-off (start/end) or recurring (cron + duration). */
export function maintenanceItemOf(draft: WindowDraft, id: () => string = randomId): MaintenanceItem {
  const base = {
    id: draft.id ?? `mw-${id()}`,
    name: draft.title,
    targets: [draft.target],
    ...(draft.reason ? { reason: draft.reason } : {}),
  };
  return draft.cron
    ? { ...base, cron: draft.cron, durationMinutes: draft.durationMinutes ?? 60 }
    : { ...base, start: draft.start, end: draft.end };
}

/** A saved item back in the form (to edit it); recurring items keep their cron and duration. */
export function draftOfItem(item: MaintenanceItem, occurrence: { start: string; end: string }): WindowDraft {
  return {
    id: item.id,
    target: item.targets?.[0] ?? '',
    title: item.name || item.id,
    start: item.start ?? occurrence.start,
    end: item.end ?? occurrence.end,
    ...(item.cron ? { cron: item.cron, durationMinutes: item.durationMinutes ?? 60 } : {}),
    ...(item.reason ? { reason: item.reason } : {}),
  };
}

export function startOfWeek(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export function addWeeks(date: Date, weeks: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

/** Occurrences (one-off and cron) expanded by the backend for the visible week (BE-31). */
export function fromOccurrences(occurrences: readonly MaintenanceOccurrence[]): MaintenanceWindow[] {
  return occurrences.map((o) => ({
    id: `${o.windowId}@${o.start}`,
    windowId: o.windowId,
    title: o.name || o.windowId,
    target: o.targets?.[0] ?? '',
    start: o.start,
    end: o.end,
  }));
}
