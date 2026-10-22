import { describe, expect, it } from 'vitest';
import { incidentWindow } from './incidentWindow';

const now = new Date('2026-10-22T12:00:00Z');

describe('FE-58 incident history window', () => {
  it('an open incident: one hour before it opened until now', () => {
    expect(incidentWindow({ openedAt: '2026-10-22T10:00:00Z', resolvedAt: null }, now)).toEqual({
      preset: 'custom', from: new Date('2026-10-22T09:00:00Z'), to: now,
    });
  });

  it('a resolved incident ends one hour after resolution; never longer than 31 days', () => {
    expect(incidentWindow({ openedAt: '2026-10-22T08:00:00Z', resolvedAt: '2026-10-22T09:00:00Z' }, now).to).toEqual(new Date('2026-10-22T10:00:00Z'));
    const long = incidentWindow({ openedAt: '2026-08-01T00:00:00Z', resolvedAt: null }, now);
    expect(long.to.getTime() - long.from.getTime()).toBe(31 * 86_400_000);
  });
});
