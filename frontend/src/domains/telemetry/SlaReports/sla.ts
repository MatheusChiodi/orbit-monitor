import { formatDuration } from '@/shared/format';
import { safeText } from '@/shared/privacy/redact';

/** Uptime over the measured time, excluding maintenance windows; null when nothing was measured. */
export function uptimePercent({ measuredMs, downMs, maintenanceMs }: { measuredMs: number; downMs: number; maintenanceMs: number }): number | null {
  const counted = measuredMs - maintenanceMs;
  if (counted <= 0) return null;
  return ((counted - Math.min(downMs, counted)) / counted) * 100;
}

export interface Coverage {
  availableMs: number;
  complete: boolean;
  ratio: number;
}

/** How much of a requested period is actually in backend memory (no Orbit database). */
export function coverage({ requestedMs, historyStart, now }: { requestedMs: number; historyStart: string | null; now: Date }): Coverage {
  const available = historyStart ? Math.max(0, Math.min(requestedMs, now.getTime() - Date.parse(historyStart))) : 0;
  return { availableMs: available, complete: available >= requestedMs, ratio: requestedMs > 0 ? available / requestedMs : 0 };
}

export interface SlaCsvRow {
  name: string;
  groupName: string;
  uptime: number | null;
  downMs: number;
  incidents: number;
}

function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV export with the history window in the header; names are redacted like everywhere else. */
export function slaToCsv(rows: readonly SlaCsvRow[], { historyHours }: { historyHours: number }): string {
  const lines = [`# history available: last ${historyHours} h`, 'monitor,group,uptime_pct,downtime,incidents'];
  const groupLines = groupSla(rows).map((g) =>
    ['group', cell(safeText(g.name)), g.uptime === null ? '' : g.uptime.toFixed(2), formatDuration(g.downMs), String(g.incidents)].join(','),
  );
  for (const row of rows) {
    lines.push(
      [
        cell(safeText(row.name)),
        cell(safeText(row.groupName)),
        row.uptime === null ? '' : row.uptime.toFixed(2),
        formatDuration(row.downMs),
        String(row.incidents),
      ].join(','),
    );
  }
  return `${[...lines, '', 'scope,group,uptime_pct,downtime,incidents', ...groupLines].join('\n')}\n`;
}

/** Uptime per group: mean of the members that were measured; downtime and incidents are summed. */
export function groupSla<T extends SlaCsvRow>(rows: readonly T[]): (SlaCsvRow & { id: string })[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) groups.set(row.groupName, [...(groups.get(row.groupName) ?? []), row]);
  return [...groups.entries()].map(([name, members]) => {
    const measured = members.map((m) => m.uptime).filter((u): u is number => u !== null);
    return {
      id: `group:${name}`,
      name,
      groupName: '',
      uptime: measured.length ? Number((measured.reduce((a, b) => a + b, 0) / measured.length).toFixed(4)) : null,
      downMs: members.reduce((a, m) => a + m.downMs, 0),
      incidents: members.reduce((a, m) => a + m.incidents, 0),
    };
  });
}
