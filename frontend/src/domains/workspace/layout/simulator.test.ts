import { describe, expect, it } from 'vitest';
import { countByStatus } from '@/domains/monitor/status';
import { mockSnapshot } from '@/domains/wall/mock';
import { pickHero } from '@/domains/wall/selectors';
import { simulateIncident } from './simulator';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('FE-17 incident simulator (pure)', () => {
  it('a fake DOWN incident becomes the hero of a calm wall', () => {
    const calm = mockSnapshot('ok', now);
    const simulated = simulateIncident(calm, { monitorId: 'checkout', severity: 'DOWN', now });
    expect(pickHero(simulated)?.monitor.id).toBe('checkout');
    expect(countByStatus(simulated.monitors).down).toBe(1);
    expect(simulated.incidents.find((i) => i.monitorId === 'checkout')?.severity).toBe('DOWN');
  });

  it('marks the snapshot and the incident as simulated', () => {
    const simulated = simulateIncident(mockSnapshot('ok', now), { monitorId: 'checkout', severity: 'WARN', now });
    expect(simulated.simulated).toBe(true);
    expect(simulated.incidents[0]?.id).toMatch(/^sim-/);
  });

  it('does not mutate the real snapshot', () => {
    const calm = mockSnapshot('ok', now);
    simulateIncident(calm, { monitorId: 'checkout', severity: 'DOWN', now });
    expect(countByStatus(calm.monitors).down).toBe(0);
    expect(calm.incidents).toHaveLength(0);
  });

  it('unknown monitor returns the snapshot unchanged', () => {
    const calm = mockSnapshot('ok', now);
    expect(simulateIncident(calm, { monitorId: 'missing', severity: 'DOWN', now }).monitors).toEqual(calm.monitors);
  });
});
