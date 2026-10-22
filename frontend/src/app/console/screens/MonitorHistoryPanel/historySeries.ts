import type { HistoryResponse } from '@/domains/telemetry/history/historyApi';

/** Values to chart: the reading (or latency when the monitor has no value) per bucket or sample. */
export function historyValues(response: HistoryResponse): (number | null)[] {
  if (response.buckets) {
    const values = response.buckets.map((b) => b.valueMean);
    return values.some((v) => v !== null) ? values : response.buckets.map((b) => b.latencyMean);
  }
  const samples = response.samples ?? [];
  const values = samples.map((s) => s.value);
  return values.some((v) => v !== null) ? values : samples.map((s) => s.latencyMs);
}

/** Share of DOWN checks in percent (rounded); null without checks. */
export function downShare(response: HistoryResponse): number | null {
  if (response.buckets) {
    const total = response.buckets.reduce((a, b) => a + b.count, 0);
    return total ? Math.round((response.buckets.reduce((a, b) => a + b.down, 0) / total) * 100) : null;
  }
  const samples = response.samples ?? [];
  return samples.length ? Math.round((samples.filter((s) => s.state === 'DOWN').length / samples.length) * 100) : null;
}
