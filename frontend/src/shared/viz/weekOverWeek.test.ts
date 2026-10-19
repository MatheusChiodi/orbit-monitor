import { describe, expect, it } from 'vitest';
import { weekOverWeekOverlay } from './weekOverWeek';

const WEEK = 7 * 24 * 3600_000;
const now = new Date('2026-10-18T17:00:00Z');
const at = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();

describe('FE-25 week-over-week overlay (pure)', () => {
  it('is unavailable when history only covers the in-memory window (24 h)', () => {
    const current = [{ at: at(3600_000), value: 10 }, { at: at(0), value: 12 }];
    const overlay = weekOverWeekOverlay({ current, history: current, historyHours: 24, now });
    expect(overlay.available).toBe(false);
    expect(overlay.reason).toEqual({ key: 'viz.wow.unavailable', params: { hours: 24 } });
    expect(overlay.points).toEqual([]);
  });

  it('shifts last week by 7 days onto the current time axis', () => {
    const current = [{ at: at(3600_000), value: 10 }, { at: at(0), value: 12 }];
    const history = [{ at: at(WEEK + 3600_000), value: 8 }, { at: at(WEEK), value: 9 }, ...current];
    const overlay = weekOverWeekOverlay({ current, history, historyHours: 24 * 8, now });
    expect(overlay.available).toBe(true);
    expect(overlay.points).toEqual([
      { at: at(3600_000), value: 8 },
      { at: at(0), value: 9 },
    ]);
  });

  it('keeps gaps from last week as nulls instead of inventing values', () => {
    const current = [{ at: at(0), value: 12 }];
    const history = [{ at: at(WEEK), value: null }, ...current];
    expect(weekOverWeekOverlay({ current, history, historyHours: 24 * 8, now }).points).toEqual([{ at: at(0), value: null }]);
  });

  it('an empty current series has no overlay', () => {
    expect(weekOverWeekOverlay({ current: [], history: [], historyHours: 24 * 8, now }).available).toBe(false);
  });
});
