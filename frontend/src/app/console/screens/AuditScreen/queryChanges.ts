import type { QueryChange } from '@/domains/monitor/components/QueryDiff';
import type { AuditEntry } from '@/shared/api/consoleTypes';

export function clientOf(address: string | null): QueryChange['client'] {
  if (!address) return 'unknown';
  if (address.startsWith('127.') || address === '::1' || address === '0:0:0:0:0:0:0:1') return 'loopback';
  return 'lan';
}

/** Consecutive `sql.save` entries of one monitor become before/after pairs (audit details are already masked). */
export function toQueryChanges(entries: readonly AuditEntry[]): QueryChange[] {
  const saves = [...entries].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const changes: QueryChange[] = [];
  for (let i = 1; i < saves.length; i++) {
    const before = saves[i - 1]!.detail ?? '';
    const current = saves[i]!;
    const after = current.detail ?? '';
    if (before === after) continue;
    changes.push({ before, after, client: clientOf(current.remoteAddress), at: current.at });
  }
  return changes.reverse();
}
