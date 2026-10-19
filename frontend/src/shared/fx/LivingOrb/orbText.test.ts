import { describe, expect, it } from 'vitest';
import { createI18n } from '@/shared/i18n/i18n';
import { buildOrbModel, type OrbMonitor } from './orbModel';
import { orbSummary, statusLabel } from './orbText';

const groups = Array.from({ length: 5 }, (_, i) => ({ id: `g${i}`, name: `Group ${i}` }));
const monitor = (i: number, over: Partial<OrbMonitor> = {}): OrbMonitor => ({
  id: `m${i}`,
  name: `Monitor ${i}`,
  groupId: `g${i % 5}`,
  type: 'HTTP',
  status: 'OK',
  value: 10,
  since: '2026-10-18T17:00:00Z',
  ...over,
});

describe('FE-59 orb text summary', () => {
  const en = createI18n('en').t;
  const pt = createI18n('pt-BR').t;

  it('mirrors the spec example', () => {
    const monitors = Array.from({ length: 20 }, (_, i) =>
      monitor(i, i === 0 ? { value: 190, rule: { field: 'QTY', operator: '<', limit: 200 } } : {}),
    );
    const model = buildOrbModel({ monitors, groups, uptime24h: 99.9 });
    expect(orbSummary(model, en)).toBe('20 monitors in 5 groups, all OK, 1 near threshold');
  });

  it('lists the problems instead of "all OK", in Portuguese too', () => {
    const monitors = [monitor(0, { status: 'DOWN', value: null }), monitor(1, { status: 'WARN' }), monitor(2)];
    const model = buildOrbModel({ monitors, groups, uptime24h: 99 });
    expect(orbSummary(model, en)).toBe('3 monitors in 3 groups, 1 down, 1 warning');
    expect(orbSummary(model, pt)).toBe('3 monitores em 3 grupos, 1 fora, 1 em atenção');
  });

  it('labels UNKNOWN like the other states', () => {
    expect(statusLabel('UNKNOWN', en)).toBe('UNKNOWN');
    expect(statusLabel('DOWN', pt)).toBe('FORA');
  });
});
