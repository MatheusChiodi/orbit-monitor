import { describe, expect, it } from 'vitest';
import { donutSlices } from '../Donut/Donut';
import { histogramBuckets } from '../Histogram/Histogram';
import { mappedTone } from '../TextStatus/TextStatus';
import { deviationPct, headroomPct, percentile, ruleHolds, withUnit } from './format';
import { gaps, lastValue, linePath, makeScales, nearestIndex } from './series';

const box = { width: 100, height: 50, pad: 0 };
const pts = [
  { at: '2026-10-18T17:00:00Z', value: 1 },
  { at: '2026-10-18T17:01:00Z', value: null },
  { at: '2026-10-18T17:02:00Z', value: 3 },
];

describe('viz core geometry', () => {
  it('breaks the line at missing points and reports one gap per run', () => {
    const s = makeScales(pts, box);
    expect(linePath(pts, s).match(/M/g)).toHaveLength(2);
    expect(gaps(pts, s)).toEqual([{ from: 0, to: 100 }]);
  });

  it('finds the nearest point and the last answer', () => {
    expect(nearestIndex(pts, Date.parse('2026-10-18T17:01:40Z'))).toBe(2);
    expect(lastValue([{ value: 1 }, { value: null }])).toBe(1);
  });
});

describe('viz core rules and numbers', () => {
  it('headroom and deviation follow the rule direction', () => {
    expect(headroomPct(160, { field: 'Q', operator: '<', limit: 200 })).toBeCloseTo(20);
    expect(headroomPct(250, { field: 'Q', operator: '>', limit: 200 })).toBeCloseTo(25);
    expect(headroomPct(0, { field: 'Q', operator: '==', limit: 0 })).toBeNull();
    expect(deviationPct(349, { field: 'Q', operator: '<', limit: 200 })).toBe(75);
    expect(ruleHolds(18, { field: 'M', operator: '<', limit: 10 })).toBe(false);
  });

  it('keeps the percent sign attached and spaces other units', () => {
    expect(withUnit('81', '%')).toBe('81%');
    expect(withUnit('182', 'ms')).toBe('182 ms');
  });

  it('nearest-rank percentile', () => {
    expect(percentile([80, 90, 95, 120, 130, 150, 210, 400, 95, 100], 95)).toBe(400);
    expect(percentile([], 95)).toBeNull();
  });

  it('histogram buckets cover every sample', () => {
    const buckets = histogramBuckets([1, 2, 3, 4, 100]);
    expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(5);
    expect(buckets.length).toBeGreaterThan(1);
  });

  it('donut folds the tail into "Other" and drops empty slices', () => {
    const slices = donutSlices(Array.from({ length: 8 }, (_, i) => ({ name: `c${i}`, value: 8 - i })).concat({ name: 'zero', value: 0 }));
    expect(slices).toHaveLength(6);
    expect(slices[5]).toMatchObject({ other: true, value: 3 + 2 + 1 });
  });

  it('unmapped text is neutral', () => {
    expect(mappedTone('UP', { UP: 'OK' })).toBe('OK');
    expect(mappedTone('MAINTENANCE', { UP: 'OK' })).toBe('neutral');
  });
});
