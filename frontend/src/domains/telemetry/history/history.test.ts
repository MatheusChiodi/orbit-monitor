import { describe, expect, it } from 'vitest';
import { clampPeriod, historyCoverage } from './history';

describe('CORE-20 in-memory history coverage', () => {
  it('coverage is the span of recorded points, capped by the window', () => {
    const now = Date.parse('2026-10-18T17:00:00Z');
    const start = now - 3 * 3_600_000;
    expect(historyCoverage({ firstPointAt: new Date(start).toISOString(), windowHours: 24 }, new Date(now))).toEqual({
      hours: 3,
      complete: false,
    });
  });

  it('a full window is complete', () => {
    const now = Date.parse('2026-10-18T17:00:00Z');
    const first = new Date(now - 30 * 3_600_000).toISOString();
    expect(historyCoverage({ firstPointAt: first, windowHours: 24 }, new Date(now))).toEqual({ hours: 24, complete: true });
  });

  it('no data at all means zero coverage (after a restart)', () => {
    expect(historyCoverage({ firstPointAt: null, windowHours: 24 }, new Date())).toEqual({ hours: 0, complete: false });
  });

  it('requested periods are clamped to the window and flagged', () => {
    expect(clampPeriod(24 * 30, 24)).toEqual({ hours: 24, clamped: true });
    expect(clampPeriod(6, 24)).toEqual({ hours: 6, clamped: false });
  });
});
