import { describe, expect, it } from 'vitest';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { createI18n } from '@/shared/i18n/i18n';
import { incidentFeed } from './incidentFeed';

const t = createI18n('en').t;
const incident: IncidentRecord = {
  id: 'inc-1',
  monitorId: 'm1',
  status: 'RESOLVED',
  severity: 'DOWN',
  openedAt: '2026-10-22T10:00:00Z',
  resolvedAt: '2026-10-22T10:05:00Z',
  acknowledgedBy: 'Ana',
  acknowledgedAt: '2026-10-22T10:01:00Z',
  ticket: null,
  events: [
    { type: 'OPENED', actor: 'orbit', at: '2026-10-22T10:00:00Z', detail: 'DOWN' },
    { type: 'ACKNOWLEDGED', actor: 'Ana', at: '2026-10-22T10:01:00Z', detail: null },
    { type: 'COMMENTED', actor: 'Ana', at: '2026-10-22T10:02:00Z', detail: 'card 4111 1111 1111 1111' },
    { type: 'RESOLVED', actor: 'orbit', at: '2026-10-22T10:05:00Z', detail: null },
  ],
};

describe('FE-38 incident feed', () => {
  it('turns state events into notifications linked to the incident page (operator actions are not notified)', () => {
    const feed = incidentFeed([incident], new Map([['m1', 'Checkout API']]), t);
    expect(feed.map((n) => [n.id, n.severity, n.title, n.href])).toEqual([
      ['inc-1:0', 'DOWN', 'Checkout API opened an incident', '#/incidents/inc-1'],
      ['inc-1:3', 'OK', 'Checkout API recovered', '#/incidents/inc-1'],
    ]);
    expect(feed.every((n) => !n.read)).toBe(true);
  });

  it('unknown monitors use a neutral name and UNKNOWN severity maps to WARN', () => {
    const feed = incidentFeed([{ ...incident, severity: 'UNKNOWN', events: [incident.events[0]!] }], new Map(), t);
    expect(feed[0]).toMatchObject({ title: 'Unknown monitor opened an incident', severity: 'WARN' });
  });
});
