import { describe, expect, it } from 'vitest';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { createI18n } from '@/shared/i18n/i18n';
import { toIncidentDetail } from './incidentDetail';

const t = createI18n('en').t;
const record: IncidentRecord = {
  id: 'inc-1',
  monitorId: 'm1',
  status: 'OPEN',
  severity: 'DOWN',
  openedAt: '2026-10-22T10:00:00Z',
  resolvedAt: null,
  acknowledgedBy: null,
  acknowledgedAt: null,
  ticket: 'OPS-7',
  events: [
    { type: 'OPENED', actor: 'orbit', at: '2026-10-22T10:00:00Z', detail: 'DOWN' },
    { type: 'COMMENTED', actor: 'lan', at: '2026-10-22T10:02:00Z', detail: 'restarting the job' },
    { type: 'TICKET_LINKED', actor: 'loopback', at: '2026-10-22T10:03:00Z', detail: 'OPS-7' },
    { type: 'ACKNOWLEDGED', actor: 'unknown', at: '2026-10-22T10:03:30Z', detail: null },
    { type: 'ACKNOWLEDGED', actor: 'Ana', at: '2026-10-22T10:03:40Z', detail: null },
    { type: 'SEVERITY_CHANGED', actor: 'orbit', at: '2026-10-22T10:04:00Z', detail: 'DOWN -> WARN' },
  ],
};
const monitors = [{ id: 'm1', name: 'Checkout API', groupId: 'g1', type: 'HTTP' as const, status: 'DOWN' as const, value: null, since: '' }];
const groups = [{ id: 'g1', name: 'Payments' }];

describe('FE-39 incident detail adapter', () => {
  it('names the monitor and group, splits comments from the timeline and maps event kinds', () => {
    const detail = toIncidentDetail(record, monitors, groups, t);
    expect(detail).toMatchObject({ monitorName: 'Checkout API', groupName: 'Payments', ticket: 'OPS-7', impact: [], escalatesAt: null });
    expect(detail.comments).toEqual([{ id: 'inc-1:1', at: '2026-10-22T10:02:00Z', author: 'lan', text: 'restarting the job' }]);
    expect(detail.events.map((e) => [e.kind, e.title, e.detail])).toEqual([
      ['DOWN', 'Opened', 'DOWN'],
      ['INFO', 'Ticket linked · This machine', 'OPS-7'],
      ['ACK', 'Acknowledged · Unknown', ''],
      ['ACK', 'Acknowledged · Ana', ''],
      ['DOWN', 'Severity changed', 'DOWN -> WARN'],
    ]);
  });

  it('pt-BR: the client kind is localized in the timeline', () => {
    const detail = toIncidentDetail(record, monitors, groups, createI18n('pt-BR').t);
    expect(detail.events[1]?.title).toBe('Chamado vinculado · Esta máquina');
  });

  it('resolved incidents end with an OK event; UNKNOWN severity shows as WARN', () => {
    const detail = toIncidentDetail(
      { ...record, severity: 'UNKNOWN', status: 'RESOLVED', resolvedAt: '2026-10-22T10:09:00Z', events: [{ type: 'RESOLVED', actor: 'orbit', at: '2026-10-22T10:09:00Z', detail: null }] },
      [],
      [],
      t,
    );
    expect(detail.severity).toBe('WARN');
    expect(detail.monitorName).toBe('Unknown monitor');
    expect(detail.events[0]).toMatchObject({ kind: 'OK', title: 'Resolved', detail: '' });
  });
});
