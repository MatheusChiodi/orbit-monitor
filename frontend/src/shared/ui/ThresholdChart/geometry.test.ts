import { describe, expect, it } from 'vitest';
import { thresholdGeometry } from './geometry';

const box = { width: 590, height: 100, padding: { top: 0, right: 0, bottom: 0, left: 0 } };

describe('thresholdGeometry', () => {
  it('spreads points across the width and includes the limit in the scale', () => {
    const g = thresholdGeometry([100, 150, 349], { limit: 200, operator: '<' }, { ...box, width: 200 });
    expect(g.points.map((p) => p?.x)).toEqual([0, 100, 200]);
    expect(g.max).toBeGreaterThanOrEqual(349);
    expect(g.min).toBeLessThanOrEqual(100);
    expect(g.limitY).toBeGreaterThan(0);
    expect(g.limitY).toBeLessThan(100);
  });

  it('marks violations according to the operator', () => {
    const g = thresholdGeometry([100, 250, 349], { limit: 200, operator: '<' }, box);
    expect(g.points.map((p) => p?.violated)).toEqual([false, true, true]);
    const min = thresholdGeometry([100, 250], { limit: 200, operator: '>=' }, box);
    expect(min.points.map((p) => p?.violated)).toEqual([true, false]);
  });

  it('groups consecutive gaps (no response)', () => {
    const g = thresholdGeometry([1, null, null, 4, null, 6], { limit: 5, operator: '<' }, { ...box, width: 500 });
    expect(g.gaps).toEqual([
      { from: 1, to: 2 },
      { from: 4, to: 4 },
    ]);
    expect(g.points[1]).toBeNull();
  });

  it('the last valid point is the current one', () => {
    const g = thresholdGeometry([1, 2, null], { limit: 5, operator: '<' }, box);
    expect(g.current?.value).toBe(2);
  });

  it('five axis ticks from -60 min to now', () => {
    const g = thresholdGeometry([1, 2], { limit: 5, operator: '<' }, box);
    expect(g.ticks.map((t) => t.minutes)).toEqual([-60, -45, -30, -15, 0]);
  });

  it('an empty series does not break', () => {
    const g = thresholdGeometry([], { limit: 5, operator: '<' }, box);
    expect(g.points).toEqual([]);
    expect(g.current).toBeNull();
  });

  it('without a limit only the values are used', () => {
    const g = thresholdGeometry([10, 20], null, box);
    expect(g.limitY).toBeNull();
    expect(g.points.every((p) => p && !p.violated)).toBe(true);
  });
});
