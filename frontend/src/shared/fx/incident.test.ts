import { describe, expect, it } from 'vitest';
import type { Incident } from '@/shared/api/types';
import { hasUnacknowledgedDown } from './incident';

const incident = (over: Partial<Incident>): Incident => ({
  id: 'i1',
  monitorId: 'm1',
  severity: 'DOWN',
  openedAt: '2026-10-18T17:00:00Z',
  acknowledgedBy: null,
  acknowledgedAt: null,
  impact: [],
  escalatesAt: null,
  ...over,
});

describe('FE-52 incident state for FX', () => {
  it('a DOWN incident without an owner pauses the background', () => {
    expect(hasUnacknowledgedDown([incident({})])).toBe(true);
  });

  it('acknowledged DOWN, WARN or nothing keeps it running', () => {
    expect(hasUnacknowledgedDown([incident({ acknowledgedBy: 'Ana' })])).toBe(false);
    expect(hasUnacknowledgedDown([incident({ severity: 'WARN' })])).toBe(false);
    expect(hasUnacknowledgedDown([])).toBe(false);
  });
});
