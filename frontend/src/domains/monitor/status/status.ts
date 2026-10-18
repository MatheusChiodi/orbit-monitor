import type { MonitorView, Status } from '@/shared/api/types';
import { msg, type Message } from '@/shared/i18n/message';
import { headroom } from '../rules';

export interface StatusCounts {
  down: number;
  warn: number;
  ok: number;
  total: number;
}

const SEVERITY_RANK: Record<Status, number> = { DOWN: 0, WARN: 1, OK: 2 };

export function countByStatus(monitors: readonly MonitorView[]): StatusCounts {
  const counts: StatusCounts = { down: 0, warn: 0, ok: 0, total: monitors.length };
  for (const monitor of monitors) {
    if (monitor.status === 'DOWN') counts.down += 1;
    else if (monitor.status === 'WARN') counts.warn += 1;
    else counts.ok += 1;
  }
  return counts;
}

export function worstStatus(statuses: readonly Status[]): Status {
  return statuses.reduce<Status>((worst, s) => (SEVERITY_RANK[s] < SEVERITY_RANK[worst] ? s : worst), 'OK');
}

export function statusFromCounts(counts: StatusCounts): Status {
  if (counts.down > 0) return 'DOWN';
  if (counts.warn > 0) return 'WARN';
  return 'OK';
}

/** Short header phrase: "1 monitor down", "2 warning", "All systems operational". */
export function globalPhrase(counts: StatusCounts): Message {
  if (counts.down > 0) return msg('status.phrase.down', { count: counts.down });
  if (counts.warn > 0) return msg('status.phrase.warn', { count: counts.warn });
  return msg('status.phrase.ok');
}

/** Tab title: "(3) Orbit". */
export function tabTitle(counts: StatusCounts): string {
  const problems = counts.down + counts.warn;
  return problems > 0 ? `(${problems}) Orbit` : 'Orbit';
}

/**
 * Exceptions first: down → warning → ok; within the same state, unowned first,
 * then the oldest; ok monitors in alphabetical order.
 */
export function sortExceptionsFirst(
  monitors: readonly MonitorView[],
  acknowledged: ReadonlySet<string> = new Set(),
): MonitorView[] {
  return [...monitors].sort((a, b) => {
    const rank = SEVERITY_RANK[a.status] - SEVERITY_RANK[b.status];
    if (rank !== 0) return rank;
    if (a.status !== 'OK') {
      const ack = Number(acknowledged.has(a.id)) - Number(acknowledged.has(b.id));
      if (ack !== 0) return ack;
      const age = Date.parse(a.since) - Date.parse(b.since);
      if (age !== 0) return age;
    }
    return a.name.localeCompare(b.name, 'en');
  });
}

export interface GroupSummary {
  ok: number;
  total: number;
  status: Status;
}

/** Data for the matrix group label: "3/4 ok · WARNING". */
export function groupSummary(monitors: readonly MonitorView[]): GroupSummary {
  const counts = countByStatus(monitors);
  return { ok: counts.ok, total: counts.total, status: statusFromCounts(counts) };
}

export interface NearLimitItem {
  monitor: MonitorView;
  headroom: number;
}

/** "Near threshold": monitors not down, with a rule and a value, from least to most headroom. */
export function nearLimit(monitors: readonly MonitorView[], max = 5): NearLimitItem[] {
  const items: NearLimitItem[] = [];
  for (const monitor of monitors) {
    if (monitor.status === 'DOWN' || !monitor.rule || monitor.value === null) continue;
    const h = headroom(monitor.value, monitor.rule);
    if (h !== null) items.push({ monitor, headroom: h });
  }
  return items.sort((a, b) => a.headroom - b.headroom).slice(0, max);
}
