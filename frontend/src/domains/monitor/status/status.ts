import type { MonitorView, Status } from '@/shared/api/types';
import { headroom } from '../rules';

export interface StatusCounts {
  down: number;
  warn: number;
  ok: number;
  total: number;
}

const SEVERITY_RANK: Record<Status, number> = { DOWN: 0, WARN: 1, OK: 2 };

const LABELS: Record<Status, string> = { DOWN: 'FORA', WARN: 'ATENÇÃO', OK: 'OK' };

export function statusLabel(status: Status): string {
  return LABELS[status];
}

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

/** Frase curta do cabeçalho: "1 monitor fora", "2 em atenção", "Tudo operacional". */
export function globalPhrase(counts: StatusCounts): string {
  if (counts.down > 0) return `${counts.down} ${counts.down === 1 ? 'monitor' : 'monitores'} fora`;
  if (counts.warn > 0) return `${counts.warn} em atenção`;
  return 'Tudo operacional';
}

/** Título da aba: "(3) Orbit". */
export function tabTitle(counts: StatusCounts): string {
  const problems = counts.down + counts.warn;
  return problems > 0 ? `(${problems}) Orbit` : 'Orbit';
}

/**
 * Exceções primeiro: fora → atenção → ok; no mesmo estado, sem responsável antes,
 * depois o mais antigo; ok em ordem alfabética.
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
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

/** Resumo do grupo na matriz: "3/4 ok · ATENÇÃO". */
export function groupSummary(monitors: readonly MonitorView[]): string {
  const counts = countByStatus(monitors);
  const base = `${counts.ok}/${counts.total} ok`;
  const status = statusFromCounts(counts);
  return status === 'OK' ? base : `${base} · ${statusLabel(status)}`;
}

export interface NearLimitItem {
  monitor: MonitorView;
  headroom: number;
}

/** "Perto do limite": monitores não fora, com regra e valor, da menor folga para a maior. */
export function nearLimit(monitors: readonly MonitorView[], max = 5): NearLimitItem[] {
  const items: NearLimitItem[] = [];
  for (const monitor of monitors) {
    if (monitor.status === 'DOWN' || !monitor.rule || monitor.value === null) continue;
    const h = headroom(monitor.value, monitor.rule);
    if (h !== null) items.push({ monitor, headroom: h });
  }
  return items.sort((a, b) => a.headroom - b.headroom).slice(0, max);
}
