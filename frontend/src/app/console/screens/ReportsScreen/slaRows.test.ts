import { describe, expect, it } from 'vitest';
import { periodRange, toSlaRow } from './slaRows';

describe('FE-43 SLA rows', () => {
  it('a period ends now and starts that many hours before', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    expect(periodRange('7d', now)).toEqual({ from: '2026-10-15T12:00:00.000Z', to: '2026-10-22T12:00:00.000Z' });
  });

  it('builds a row from the history summary and the incidents opened in the range', () => {
    const row = toSlaRow(
      { id: 'm1', name: 'Checkout', groupId: 'g', type: 'HTTP', status: 'OK', value: null, since: '' },
      'Payments',
      { from: '2026-10-21T12:00:00Z', to: '2026-10-22T12:00:00Z', samples: 1440, down: 12, uptimePercent: 99.1667, p50: null, p95: null, p99: null },
      [
        { monitorId: 'm1', openedAt: '2026-10-22T01:00:00Z' },
        { monitorId: 'm1', openedAt: '2026-10-01T01:00:00Z' },
        { monitorId: 'm2', openedAt: '2026-10-22T01:00:00Z' },
      ],
    );
    expect(row).toEqual({ id: 'm1', name: 'Checkout', groupName: 'Payments', uptime: 99.1667, downMs: 12 * 60_000, incidents: 1 });
  });

  it('without samples there is no uptime number', () => {
    const row = toSlaRow(
      { id: 'm1', name: 'X', groupId: 'g', type: 'HTTP', status: 'OK', value: null, since: '' },
      '',
      { from: '2026-10-21T12:00:00Z', to: '2026-10-22T12:00:00Z', samples: 0, down: 0, uptimePercent: null, p50: null, p95: null, p99: null },
      [],
    );
    expect(row).toMatchObject({ uptime: null, downMs: 0 });
  });
});
