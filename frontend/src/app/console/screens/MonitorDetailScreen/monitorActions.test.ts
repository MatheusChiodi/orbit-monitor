import { describe, expect, it } from 'vitest';
import { historyExportHref, isPaused, savedMonitorId } from './monitorActions';

describe('monitor detail helpers', () => {
  it('reads the paused flag', () => {
    expect(isPaused({ paused: true })).toBe(true);
    expect(isPaused({})).toBe(false);
    expect(isPaused(undefined)).toBe(false);
  });

  it('reads the id of the saved monitor from the answer', () => {
    expect(savedMonitorId({ definition: { id: 'http_copy_1a2b3c' } })).toBe('http_copy_1a2b3c');
    expect(savedMonitorId({ id: 'demo' })).toBe('demo');
    expect(savedMonitorId(null)).toBeNull();
  });

  it('builds the CSV export address for the period', () => {
    const href = historyExportHref('a b', { from: new Date('2026-10-24T00:00:00Z'), to: new Date('2026-10-24T12:00:00Z') });
    expect(href).toBe('/api/history/a%20b/export?from=2026-10-24T00%3A00%3A00.000Z&to=2026-10-24T12%3A00%3A00.000Z&format=csv');
  });
});
