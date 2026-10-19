import { describe, expect, it } from 'vitest';
import type { Group } from '@/shared/api/types';
import {
  AGGREGATE_ABOVE,
  PULSE_MS,
  buildOrbModel,
  coreBrightness,
  driftFactor,
  heartbeatProgress,
  nextSatellite,
  satelliteAngle,
  satelliteSize,
  satelliteSpeed,
  worstOrbStatus,
  type OrbMonitor,
} from './orbModel';

const groups: Group[] = [
  { id: 'pay', name: 'Payments' },
  { id: 'core', name: 'Core Banking' },
  { id: 'empty', name: 'No monitors' },
];

const monitor = (over: Partial<OrbMonitor> & { id: string }): OrbMonitor => ({
  name: over.id,
  groupId: 'pay',
  type: 'SQL',
  status: 'OK',
  value: 10,
  since: '2026-10-18T17:00:00Z',
  ...over,
});

describe('FE-59 orb model — core', () => {
  it('core color is the worst state; maintenance does not count', () => {
    expect(worstOrbStatus(['OK', 'UNKNOWN', 'WARN'])).toBe('WARN');
    expect(worstOrbStatus(['OK', 'DOWN', 'WARN'])).toBe('DOWN');
    const model = buildOrbModel({
      monitors: [monitor({ id: 'a' }), monitor({ id: 'b', status: 'DOWN', maintenance: true })],
      groups,
      uptime24h: 99.9,
    });
    expect(model.core.status).toBe('OK');
  });

  it('core brightness follows the 24 h availability', () => {
    expect(coreBrightness(100)).toBe(1);
    expect(coreBrightness(90)).toBe(0.35);
    expect(coreBrightness(99)).toBeGreaterThan(coreBrightness(97));
  });
});

describe('FE-59 orb model — rings', () => {
  const model = buildOrbModel({
    monitors: [monitor({ id: 'a' }), monitor({ id: 'b', groupId: 'core', status: 'WARN' })],
    groups,
    uptime24h: 99.9,
  });

  it('one ring per group with monitors, in group (priority) order, growing outwards', () => {
    expect(model.rings.map((r) => r.groupId)).toEqual(['pay', 'core']);
    expect(model.rings[1]!.radius).toBeGreaterThan(model.rings[0]!.radius);
  });

  it('ring tint is the group state and a warning ring is slightly thicker', () => {
    expect(model.rings.map((r) => r.status)).toEqual(['OK', 'WARN']);
    expect(model.rings[1]!.thickness).toBeGreaterThan(model.rings[0]!.thickness);
  });

  it('many groups still fit inside the scene', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `g${i}`, name: `G${i}` }));
    const big = buildOrbModel({ monitors: many.map((g) => monitor({ id: g.id, groupId: g.id })), groups: many, uptime24h: 100 });
    expect(Math.max(...big.rings.map((r) => r.radius))).toBeLessThanOrEqual(2.5 + 1e-9);
  });
});

describe('FE-59 orb model — satellites', () => {
  it('one satellite per monitor with its state, on its group ring', () => {
    const model = buildOrbModel({
      monitors: [monitor({ id: 'a' }), monitor({ id: 'b', status: 'UNKNOWN' }), monitor({ id: 'c', groupId: 'core' })],
      groups,
      uptime24h: 100,
    });
    expect(model.satellites.map((s) => [s.id, s.status, s.ring])).toEqual([
      ['a', 'OK', 0],
      ['b', 'UNKNOWN', 0],
      ['c', 'OK', 1],
    ]);
  });

  it('size grows with importance; speed grows with check frequency, slow and bounded', () => {
    expect(satelliteSize(3)).toBeGreaterThan(satelliteSize(1));
    expect(satelliteSpeed(10)).toBeGreaterThan(satelliteSpeed(60));
    expect(satelliteSpeed(1)).toBeLessThanOrEqual(0.3);
    expect(satelliteSpeed(86_400)).toBeGreaterThanOrEqual(0.03);
  });

  it('drifts towards the core as headroom shrinks; amber halo below 25 %', () => {
    expect(driftFactor(1)).toBe(1);
    expect(driftFactor(0)).toBeCloseTo(0.82);
    const model = buildOrbModel({
      monitors: [
        monitor({ id: 'calm', value: 10, rule: { field: 'QTY', operator: '<', limit: 200 } }),
        monitor({ id: 'close', value: 180, rule: { field: 'QTY', operator: '<', limit: 200 } }),
      ],
      groups,
      uptime24h: 100,
    });
    const [calm, close] = model.satellites;
    expect(close!.radiusFactor).toBeLessThan(calm!.radiusFactor);
    expect(close!.amberHalo).toBe(true);
    expect(calm!.amberHalo).toBe(false);
    expect(model.counts.near).toBe(1);
  });

  it('DOWN stops and leaves a trail; maintenance is hollow and still', () => {
    const model = buildOrbModel({
      monitors: [monitor({ id: 'down', status: 'DOWN', value: null }), monitor({ id: 'maint', maintenance: true })],
      groups,
      uptime24h: 99,
    });
    const [down, maint] = model.satellites;
    expect(down).toMatchObject({ speed: 0, trail: true, hollow: false });
    expect(maint).toMatchObject({ speed: 0, trail: false, hollow: true });
    expect(satelliteAngle(down!, 100)).toBe(down!.baseAngle);
  });

  it(`above ${AGGREGATE_ABOVE} monitors, satellites aggregate per group and state with a count`, () => {
    const monitors = Array.from({ length: 70 }, (_, i) =>
      monitor({ id: `m${i}`, groupId: i % 2 ? 'pay' : 'core', status: i === 3 ? 'DOWN' : 'OK' }),
    );
    const model = buildOrbModel({ monitors, groups, uptime24h: 99 });
    expect(model.aggregated).toBe(true);
    expect(model.satellites).toHaveLength(3);
    const down = model.satellites.find((s) => s.status === 'DOWN');
    expect(down).toMatchObject({ count: 1, monitorIds: ['m3'], groupId: 'pay' });
    expect(model.satellites.reduce((n, s) => n + s.count, 0)).toBe(70);
  });
});

describe('FE-59 orb model — heartbeat, counts and keyboard order', () => {
  const model = buildOrbModel({
    monitors: [
      monitor({ id: 'a', lastCheckAt: '2026-10-18T17:00:00.000Z' }),
      monitor({ id: 'b', intervalSeconds: 10 }),
      monitor({ id: 'c', groupId: 'core', status: 'WARN' }),
    ],
    groups,
    uptime24h: 100,
  });

  it('a pulse runs to the core right after each check, then stops', () => {
    const a = model.satellites[0]!;
    const checked = Date.parse('2026-10-18T17:00:00.000Z');
    expect(heartbeatProgress(a, checked + PULSE_MS / 2)).toBeCloseTo(0.5);
    expect(heartbeatProgress(a, checked + PULSE_MS + 1)).toBeNull();
  });

  it('without a last check, it pulses once per interval', () => {
    const b = model.satellites[1]!;
    const pulses = Array.from({ length: 100 }, (_, i) => heartbeatProgress(b, i * 100)).filter((p) => p !== null);
    expect(pulses.length).toBeGreaterThan(0);
    expect(pulses.length).toBeLessThanOrEqual(PULSE_MS / 100 + 1);
  });

  it('counts by state for the text summary', () => {
    expect(model.counts).toMatchObject({ monitors: 3, groups: 2, OK: 2, WARN: 1, DOWN: 0 });
  });

  it('arrow keys cycle ring by ring and wrap', () => {
    expect(nextSatellite(model, null, 1)).toBe('a');
    expect(nextSatellite(model, 'a', 1)).toBe('b');
    expect(nextSatellite(model, 'b', 1)).toBe('c');
    expect(nextSatellite(model, 'c', 1)).toBe('a');
    expect(nextSatellite(model, 'a', -1)).toBe('c');
  });
});
