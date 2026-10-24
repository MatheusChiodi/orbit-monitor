import { describe, expect, it } from 'vitest';
import type { MonitorView } from '@/shared/api/types';
import { railCounts, railLayout, railMonitors, trackPoint } from './railLayout';

const monitor = (id: string, groupId: string, status: MonitorView['status'] = 'OK', type = 'HTTP'): MonitorView =>
  ({ id, name: id, groupId, type, status, value: null, since: '2026-10-24T10:00:00Z' }) as MonitorView;

const groups = [
  { id: 'web', name: 'Web' },
  { id: 'db', name: 'Databases' },
];

describe('FE-68 orbit rail layout', () => {
  it('leaves out the built-in self check', () => {
    expect(railMonitors([monitor('orbit_self', '', 'OK', 'SELF'), monitor('a', 'web')]).map((m) => m.id)).toEqual(['a']);
  });

  it('puts Down monitors first, centered at 12 o\'clock', () => {
    const layout = railLayout([monitor('a', 'web'), monitor('b', 'db', 'DOWN'), monitor('c', 'web')], groups);
    expect(layout[0]!.monitor.id).toBe('b');
    expect(layout[0]!.angle).toBe(-90);
  });

  it('keeps each group together, in group order, with a gap between groups', () => {
    const layout = railLayout([monitor('d1', 'db'), monitor('w1', 'web'), monitor('w2', 'web')], groups);
    expect(layout.map((s) => s.monitor.id)).toEqual(['w1', 'w2', 'd1']);
    const [w1, w2, d1] = layout.map((s) => s.angle);
    expect(d1! - w2!).toBeCloseTo(2 * (w2! - w1!));
  });

  it('an empty install has no satellites', () => {
    expect(railLayout([], groups)).toEqual([]);
  });

  it('counts states', () => {
    expect(railCounts([monitor('a', 'web', 'DOWN'), monitor('b', 'web', 'WARN'), monitor('c', 'web'), monitor('d', 'web')])).toEqual({
      down: 1,
      warn: 1,
      ok: 2,
    });
  });

  it('12 o\'clock is the top of the track', () => {
    const top = trackPoint(-90, { width: 400, height: 72 });
    expect(top.x).toBeCloseTo(200);
    expect(top.y).toBeLessThan(36);
  });
});
