import type { MaintenanceWindow, NewMaintenanceWindow } from '@/domains/alerting/MaintenanceCalendar';
import type { MaintenanceItem } from '@/shared/api/consoleTypes';

/** One-off windows (start/end) go on the calendar; recurring (cron) windows are listed by the backend only. */
export function toCalendarWindows(items: readonly MaintenanceItem[]): MaintenanceWindow[] {
  return items
    .filter((item) => item.start && item.end)
    .map((item) => ({
      id: item.id,
      title: item.name || item.id,
      groupId: item.targets?.[0] ?? '',
      start: item.start!,
      end: item.end!,
    }));
}

const randomId = () => Math.random().toString(36).slice(2, 10);

export function newMaintenanceItem(window: NewMaintenanceWindow, id: () => string = randomId): MaintenanceItem {
  return { id: `mw-${id()}`, name: window.title, targets: [window.groupId], start: window.start, end: window.end };
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
