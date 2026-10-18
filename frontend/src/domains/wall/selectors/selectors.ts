import type { Group, Incident, MonitorView, Status, WallSnapshot } from '@/shared/api/types';
import { groupSummary, sortExceptionsFirst, worstStatus, type GroupSummary } from '@/domains/monitor/status';

export interface HeroSelection {
  monitor: MonitorView;
  incident: Incident | null;
  group: Group | null;
}

function acknowledgedIds(snapshot: WallSnapshot): Set<string> {
  return new Set(snapshot.incidents.filter((i) => i.acknowledgedBy).map((i) => i.monitorId));
}

/** The hero is the worst problem: down before warning, unowned before owned, oldest first. */
export function pickHero(snapshot: WallSnapshot): HeroSelection | null {
  const problems = snapshot.monitors.filter((m) => m.status !== 'OK');
  const [monitor] = sortExceptionsFirst(problems, acknowledgedIds(snapshot));
  if (!monitor) return null;
  return {
    monitor,
    incident: snapshot.incidents.find((i) => i.monitorId === monitor.id) ?? null,
    group: snapshot.groups.find((g) => g.id === monitor.groupId) ?? null,
  };
}

/** "Also active": the other monitors with problems, without the hero. */
export function alsoActive(snapshot: WallSnapshot, heroMonitorId: string | null): MonitorView[] {
  const others = snapshot.monitors.filter((m) => m.status !== 'OK' && m.id !== heroMonitorId);
  return sortExceptionsFirst(others, acknowledgedIds(snapshot));
}

export interface GroupRow {
  group: Group;
  status: Status;
  summary: GroupSummary;
  monitors: MonitorView[];
}

const RANK: Record<Status, number> = { DOWN: 0, WARN: 1, OK: 2 };

/** Matrix rows: groups with problems move up; problem cells come first. */
export function groupRows(snapshot: WallSnapshot): GroupRow[] {
  const acked = acknowledgedIds(snapshot);
  const rows: GroupRow[] = [];
  for (const group of snapshot.groups) {
    const monitors = snapshot.monitors.filter((m) => m.groupId === group.id);
    if (monitors.length === 0) continue;
    rows.push({
      group,
      status: worstStatus(monitors.map((m) => m.status)),
      summary: groupSummary(monitors),
      monitors: sortExceptionsFirst(monitors, acked),
    });
  }
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => RANK[a.row.status] - RANK[b.row.status] || a.index - b.index)
    .map(({ row }) => row);
}
