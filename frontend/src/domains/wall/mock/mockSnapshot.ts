import type { Group, Incident, MonitorView, Rule, Status, TimelineEvent, WallSnapshot } from '@/shared/api/types';

export type MockScenario = 'incident' | 'ok';

/** Deterministic PRNG (mulberry32) so the demo wall does not "jump" on every render. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 60 points going from `from` to `to`, with light noise and optional gaps. */
export function mockSeries(from: number, to: number, seed: number, gaps: number[] = []): (number | null)[] {
  const rand = random(seed);
  const holes = new Set(gaps);
  return Array.from({ length: 60 }, (_, i) => {
    if (i === 59) return to;
    if (holes.has(i)) return null;
    const progress = i / 59;
    const eased = progress * progress;
    const base = from + (to - from) * eased;
    const noise = (rand() - 0.5) * Math.abs(from) * 0.08;
    return Math.round((base + noise) * 10) / 10;
  });
}

const GROUPS: Group[] = [
  { id: 'pay', name: 'Payments' },
  { id: 'portal', name: 'Customer Portal' },
  { id: 'core', name: 'Core Banking' },
  { id: 'integ', name: 'Integrations' },
  { id: 'infra', name: 'Infrastructure' },
];

interface MonitorSeed {
  id: string;
  name: string;
  groupId: string;
  type: MonitorView['type'];
  value: number;
  unit?: string;
  rule?: Rule;
  /** State and value in the incident scenario, when different from normal. */
  incident?: { status: Status; value: number };
}

const SEEDS: MonitorSeed[] = [
  {
    id: 'reconciliation',
    name: 'Reconciliation queue',
    groupId: 'pay',
    type: 'SQL',
    value: 120,
    unit: 'QTY',
    rule: { field: 'QTY', operator: '<', limit: 200 },
    incident: { status: 'DOWN', value: 349 },
  },
  { id: 'checkout', name: 'Checkout API', groupId: 'pay', type: 'HTTP', value: 182, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 800 } },
  {
    id: 'acquirer',
    name: 'Acquirer error rate',
    groupId: 'pay',
    type: 'SQL',
    value: 0.8,
    unit: '%',
    rule: { field: 'ERROR_PCT', operator: '<', limit: 2 },
    incident: { status: 'WARN', value: 1.7 },
  },
  { id: 'refunds', name: 'Pending refunds', groupId: 'pay', type: 'SQL', value: 12, unit: 'QTY', rule: { field: 'QTY', operator: '<', limit: 50 } },
  { id: 'web-portal', name: 'Web portal', groupId: 'portal', type: 'HTTP', value: 240, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 800 } },
  { id: 'auth', name: 'Authentication API', groupId: 'portal', type: 'HTTP', value: 95, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 500 } },
  { id: 'cert', name: 'Portal certificate', groupId: 'portal', type: 'HTTP', value: 64, unit: 'days', rule: { field: 'CERT_DAYS_LEFT', operator: '>', limit: 14 } },
  { id: 'sessions', name: 'Active sessions', groupId: 'portal', type: 'SQL', value: 1840, unit: 'QTY', rule: { field: 'QTY', operator: '<', limit: 5000 } },
  { id: 'locks', name: 'Blocking locks', groupId: 'core', type: 'SQL', value: 0, unit: 'QTY', rule: { field: 'ROWS', operator: '==', limit: 0 } },
  {
    id: 'tablespace',
    name: 'USERS tablespace',
    groupId: 'core',
    type: 'SQL',
    value: 71,
    unit: '%',
    rule: { field: 'USED_PCT', operator: '<', limit: 85 },
    incident: { status: 'WARN', value: 81 },
  },
  { id: 'ledger', name: 'Last ledger batch', groupId: 'core', type: 'SQL', value: 14, unit: 'min', rule: { field: 'MIN_SINCE', operator: '<', limit: 60 } },
  { id: 'replica', name: 'Replica lag', groupId: 'core', type: 'SQL', value: 2, unit: 's', rule: { field: 'LAG', operator: '<', limit: 30 } },
  { id: 'event-bus', name: 'Event bus', groupId: 'integ', type: 'PING', value: 4, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 100 } },
  { id: 'invoices', name: 'Invoice issuing', groupId: 'integ', type: 'HTTP', value: 410, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 1500 } },
  { id: 'nightly', name: 'Nightly batch job', groupId: 'integ', type: 'PUSH', value: 6, unit: 'h', rule: { field: 'HOURS_SINCE', operator: '<', limit: 26 } },
  { id: 'crm', name: 'CRM sync', groupId: 'integ', type: 'HTTP', value: 520, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 2000 } },
  { id: 'actuator', name: 'Orbit /actuator/health', groupId: 'infra', type: 'HTTP', value: 8, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 300 } },
  { id: 'disk', name: 'App server disk', groupId: 'infra', type: 'PING', value: 62, unit: '%', rule: { field: 'USED_PCT', operator: '<', limit: 90 } },
  { id: 'mq', name: 'MQ queue', groupId: 'infra', type: 'PING', value: 3, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 50 } },
  { id: 'dns', name: 'Internal DNS', groupId: 'infra', type: 'PING', value: 1, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 50 } },
];

function minutesAgo(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

function buildMonitor(seed: MonitorSeed, index: number, scenario: MockScenario, now: Date): MonitorView {
  const failing = scenario === 'incident' && seed.incident;
  const status: Status = failing ? seed.incident!.status : 'OK';
  const value = failing ? seed.incident!.value : seed.value;
  const gaps = failing && status === 'DOWN' ? [44, 45] : [];
  return {
    id: seed.id,
    name: seed.name,
    groupId: seed.groupId,
    type: seed.type,
    status,
    value,
    unit: seed.unit,
    rule: seed.rule,
    since: failing ? minutesAgo(now, status === 'DOWN' ? 4 + 1 / 60 : 18 + index) : minutesAgo(now, 300 + index * 7),
    series: mockSeries(seed.value, value, index + 1, gaps),
  };
}

export function mockSnapshot(scenario: MockScenario, now: Date = new Date()): WallSnapshot {
  const monitors = SEEDS.map((seed, i) => buildMonitor(seed, i, scenario, now));
  const incidents: Incident[] =
    scenario === 'incident'
      ? [
          {
            id: 'inc-reconciliation',
            monitorId: 'reconciliation',
            severity: 'DOWN',
            openedAt: minutesAgo(now, 4 + 1 / 60),
            acknowledgedBy: null,
            acknowledgedAt: null,
            impact: ['Checkout', 'Merchant payouts', 'Daily report'],
            escalatesAt: minutesAgo(now, -11),
          },
          {
            id: 'inc-tablespace',
            monitorId: 'tablespace',
            severity: 'WARN',
            openedAt: minutesAgo(now, 27),
            acknowledgedBy: 'R. Lima',
            acknowledgedAt: minutesAgo(now, 20),
            impact: ['Core Banking'],
            escalatesAt: null,
          },
        ]
      : [];

  const timeline: TimelineEvent[] =
    scenario === 'incident'
      ? [
          { id: 'ev-1', at: minutesAgo(now, 4 + 1 / 60), kind: 'DOWN', title: 'Reconciliation queue down', detail: 'QTY = 349 · rule QTY < 200' },
          { id: 'ev-2', at: minutesAgo(now, 9), kind: 'WARN', title: 'Acquirer error rate warning', detail: 'ERROR_PCT = 1.7 · rule ERROR_PCT < 2' },
          { id: 'ev-3', at: minutesAgo(now, 20), kind: 'ACK', title: 'R. Lima acknowledged USERS tablespace', detail: 'ticket INC-4821' },
          { id: 'ev-4', at: minutesAgo(now, 27), kind: 'WARN', title: 'USERS tablespace warning', detail: 'USED_PCT = 81 · rule USED_PCT < 85' },
          { id: 'ev-5', at: minutesAgo(now, 95), kind: 'OK', title: 'Invoice issuing recovered', detail: 'down for 6min 12s' },
        ]
      : [
          { id: 'ev-ok-1', at: minutesAgo(now, 95), kind: 'OK', title: 'Invoice issuing recovered', detail: 'down for 6min 12s' },
          { id: 'ev-ok-2', at: minutesAgo(now, 240), kind: 'INFO', title: 'Maintenance window ended', detail: 'Core Banking' },
        ];

  return {
    generatedAt: now.toISOString(),
    environment: 'Production',
    groups: GROUPS,
    monitors,
    incidents,
    timeline,
    uptime24h: scenario === 'incident' ? 99.82 : 99.97,
    lastRecoveryAt: minutesAgo(now, 95),
  };
}
