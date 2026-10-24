import { describe, expect, it } from 'vitest';
import { incidentWindow } from './incidentWindow';

const now = new Date('2026-10-22T12:00:00Z');

describe('FE-58 incident history window', () => {
  it('a recent incident opens on the same 24 h preset as the monitor detail', () => {
    expect(incidentWindow({ openedAt: '2026-10-22T10:00:00Z', resolvedAt: null }, now)).toEqual({
      preset: '24h', from: new Date('2026-10-21T12:00:00Z'), to: now,
    });
  });

  it('an older incident: one hour before it opened until one hour after it resolved', () => {
    expect(incidentWindow({ openedAt: '2026-10-20T08:00:00Z', resolvedAt: '2026-10-20T09:00:00Z' }, now)).toEqual({
      preset: 'custom', from: new Date('2026-10-20T07:00:00Z'), to: new Date('2026-10-20T10:00:00Z'),
    });
  });

  it('never longer than 31 days', () => {
    const long = incidentWindow({ openedAt: '2026-08-01T00:00:00Z', resolvedAt: null }, now);
    expect(long.to.getTime() - long.from.getTime()).toBe(31 * 86_400_000);
  });
});
