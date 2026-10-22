import { describe, expect, it } from 'vitest';
import type { HistoryResponse } from '@/domains/telemetry/history/historyApi';
import { downShare, historyValues } from './historySeries';

const base = { monitorId: 'm', from: 'a', to: 'b', resolution: '1m' as const, coverage: { oldest: null, newest: 'b', retentionDays: 30, rawWritesEnabled: true } };
const bucket = (down: number, count: number, valueMean: number | null, latencyMean: number | null) => ({
  start: 's', count, ok: count - down, warn: 0, down, unknown: 0, latencyMin: null, latencyMax: null, latencyMean, latencyP95: null, valueMin: null, valueMax: null, valueMean,
});

describe('FE-58 history series', () => {
  it('charts the reading, or the latency when the monitor has no value', () => {
    expect(historyValues({ ...base, samples: null, buckets: [bucket(0, 1, 5, 100), bucket(0, 1, null, 120)] } as HistoryResponse)).toEqual([5, null]);
    expect(historyValues({ ...base, samples: null, buckets: [bucket(0, 1, null, 100)] } as HistoryResponse)).toEqual([100]);
    expect(historyValues({ ...base, resolution: 'raw', buckets: null, samples: [{ key: 'k', at: 'a', state: 'OK', latencyMs: 80, value: null, error: null }] } as HistoryResponse)).toEqual([80]);
  });

  it('down share over buckets or samples', () => {
    expect(downShare({ ...base, samples: null, buckets: [bucket(1, 3, null, null), bucket(0, 1, null, null)] } as HistoryResponse)).toBe(25);
    expect(downShare({ ...base, samples: null, buckets: [] } as HistoryResponse)).toBeNull();
  });
});
