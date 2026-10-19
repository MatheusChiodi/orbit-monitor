import { describe, expect, it } from 'vitest';
import {
  customRange,
  fromLocalInput,
  presetRange,
  rangeCoverage,
  resolutionFor,
  toLocalInput,
  type StoreCoverage,
} from './range';

const NOW = new Date('2026-10-18T12:00:00Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const coverage = (oldest: string | null): StoreCoverage => ({
  oldest,
  newest: NOW.toISOString(),
  retentionDays: 30,
  rawWritesEnabled: true,
});

describe('FE-58 history ranges', () => {
  it('presets end now and span 24 h, 7 d and 30 d', () => {
    expect(presetRange('24h', NOW).from.getTime()).toBe(NOW.getTime() - DAY);
    expect(presetRange('7d', NOW).from.getTime()).toBe(NOW.getTime() - 7 * DAY);
    const month = presetRange('30d', NOW);
    expect(month).toEqual({ preset: '30d', from: new Date(NOW.getTime() - 30 * DAY), to: NOW });
  });

  it('custom periods must be ordered, start in the past and stay within 31 days', () => {
    expect(customRange(NOW, new Date(NOW.getTime() - HOUR), NOW).error).toBe('order');
    expect(customRange(new Date(NOW.getTime() + HOUR), new Date(NOW.getTime() + 2 * HOUR), NOW).error).toBe('future');
    expect(customRange(new Date(NOW.getTime() - 32 * DAY), NOW, NOW).error).toBe('tooLong');
    expect(customRange(fromLocalInput(''), NOW, NOW).error).toBe('order');
  });

  it('a custom end in the future is clamped to now', () => {
    const result = customRange(new Date(NOW.getTime() - DAY), new Date(NOW.getTime() + DAY), NOW);
    expect(result.range).toEqual({ preset: 'custom', from: new Date(NOW.getTime() - DAY), to: NOW });
  });

  it('resolution follows the backend rule', () => {
    expect(resolutionFor({ from: new Date(NOW.getTime() - 6 * HOUR), to: NOW })).toBe('raw');
    expect(resolutionFor({ from: new Date(NOW.getTime() - 7 * DAY), to: NOW })).toBe('1m');
    expect(resolutionFor({ from: new Date(NOW.getTime() - 8 * DAY), to: NOW })).toBe('1h');
  });

  it('coverage is the share of the period after the oldest stored data', () => {
    const range = presetRange('30d', NOW);
    const partial = rangeCoverage(coverage(new Date(NOW.getTime() - 3 * DAY).toISOString()), range);
    expect(partial.fraction).toBeCloseTo(0.1, 5);
    expect(partial.complete).toBe(false);
    expect(partial.coveredFrom).toEqual(new Date(NOW.getTime() - 3 * DAY));

    const full = rangeCoverage(coverage(new Date(NOW.getTime() - 40 * DAY).toISOString()), range);
    expect(full).toEqual({ coveredFrom: range.from, fraction: 1, complete: true });
  });

  it('nothing stored means no coverage', () => {
    expect(rangeCoverage(coverage(null), presetRange('24h', NOW))).toEqual({
      coveredFrom: null,
      fraction: 0,
      complete: false,
    });
  });

  it('datetime-local values round-trip in local time', () => {
    const date = new Date(2026, 9, 18, 9, 5);
    expect(toLocalInput(date)).toBe('2026-10-18T09:05');
    expect(fromLocalInput('2026-10-18T09:05')).toEqual(date);
  });
});
