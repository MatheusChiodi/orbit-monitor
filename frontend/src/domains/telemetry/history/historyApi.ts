import { useQuery } from '@tanstack/react-query';
import type { HistoryRange, Resolution, StoreCoverage } from './range';

/** One stored check (`resolution = raw`). */
export interface HistorySamplePoint {
  key: string;
  at: string;
  state: 'OK' | 'UNKNOWN' | 'WARN' | 'DOWN';
  latencyMs: number;
  value: number | null;
  error: string | null;
}

/** One rollup bucket (`resolution = 1m | 1h`); null fields mean "no data". */
export interface HistoryBucketPoint {
  start: string;
  count: number;
  ok: number;
  warn: number;
  down: number;
  unknown: number;
  latencyMin: number | null;
  latencyMax: number | null;
  latencyMean: number | null;
  latencyP95: number | null;
  valueMin: number | null;
  valueMax: number | null;
  valueMean: number | null;
}

/** `GET /api/history/{monitorId}` (BE-52). */
export interface HistoryResponse {
  monitorId: string;
  from: string;
  to: string;
  resolution: Resolution;
  coverage: StoreCoverage;
  samples: HistorySamplePoint[] | null;
  buckets: HistoryBucketPoint[] | null;
}

type Fetch = typeof fetch;

async function getJson<T>(url: string, doFetch: Fetch): Promise<T> {
  const response = await doFetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as T;
}

export function fetchCoverage(doFetch: Fetch = (i, o) => globalThis.fetch(i, o)): Promise<StoreCoverage> {
  return getJson<StoreCoverage>('/api/history/coverage', doFetch);
}

export function historyUrl(monitorId: string, range: Pick<HistoryRange, 'from' | 'to'>, resolution?: Resolution): string {
  const params = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
  if (resolution) params.set('resolution', resolution);
  return `/api/history/${encodeURIComponent(monitorId)}?${params.toString()}`;
}

export function fetchHistory(
  monitorId: string,
  range: Pick<HistoryRange, 'from' | 'to'>,
  resolution?: Resolution,
  doFetch: Fetch = (i, o) => globalThis.fetch(i, o),
): Promise<HistoryResponse> {
  return getJson<HistoryResponse>(historyUrl(monitorId, range, resolution), doFetch);
}

/** Period the 30-day store covers; refreshed every few minutes. */
export function useHistoryCoverage() {
  return useQuery({ queryKey: ['history', 'coverage'], queryFn: () => fetchCoverage(), staleTime: 5 * 60_000 });
}
