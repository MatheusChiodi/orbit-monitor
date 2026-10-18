import type { Group, Incident, MonitorView, Rule, Status, TimelineEvent, WallSnapshot } from '@/shared/api/types';

export type MockScenario = 'incident' | 'ok';

/** PRNG determinístico (mulberry32) para a parede de demonstração não "pular" a cada render. */
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

/** 60 pontos indo de `from` até `to`, com ruído leve e buracos opcionais. */
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
  { id: 'pag', name: 'Pagamentos' },
  { id: 'portal', name: 'Portal do Cliente' },
  { id: 'core', name: 'Banco Core' },
  { id: 'integ', name: 'Integrações' },
  { id: 'infra', name: 'Infraestrutura' },
];

interface MonitorSeed {
  id: string;
  name: string;
  groupId: string;
  type: MonitorView['type'];
  value: number;
  unit?: string;
  rule?: Rule;
  /** Estado e valor no cenário de incidente, quando diferem do normal. */
  incident?: { status: Status; value: number };
}

const SEEDS: MonitorSeed[] = [
  {
    id: 'conciliacao',
    name: 'Fila de conciliação',
    groupId: 'pag',
    type: 'SQL',
    value: 120,
    unit: 'QTD',
    rule: { field: 'QTD', operator: '<', limit: 200 },
    incident: { status: 'DOWN', value: 349 },
  },
  { id: 'checkout', name: 'API de checkout', groupId: 'pag', type: 'HTTP', value: 182, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 800 } },
  {
    id: 'adquirente',
    name: 'Taxa de erro adquirente',
    groupId: 'pag',
    type: 'SQL',
    value: 0.8,
    unit: '%',
    rule: { field: 'PCT_ERRO', operator: '<', limit: 2 },
    incident: { status: 'WARN', value: 1.7 },
  },
  { id: 'estorno', name: 'Estornos pendentes', groupId: 'pag', type: 'SQL', value: 12, unit: 'QTD', rule: { field: 'QTD', operator: '<', limit: 50 } },
  { id: 'portal-web', name: 'Portal web', groupId: 'portal', type: 'HTTP', value: 240, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 800 } },
  { id: 'auth', name: 'API de autenticação', groupId: 'portal', type: 'HTTP', value: 95, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 500 } },
  { id: 'cert', name: 'Certificado portal', groupId: 'portal', type: 'HTTP', value: 64, unit: 'dias', rule: { field: 'CERT_DAYS_LEFT', operator: '>', limit: 14 } },
  {
    id: 'sessoes',
    name: 'Sessões ativas',
    groupId: 'portal',
    type: 'SQL',
    value: 1840,
    unit: 'QTD',
    rule: { field: 'QTD', operator: '<', limit: 5000 },
  },
  {
    id: 'locks',
    name: 'Locks bloqueantes',
    groupId: 'core',
    type: 'SQL',
    value: 0,
    unit: 'QTD',
    rule: { field: 'ROWS', operator: '==', limit: 0 },
  },
  {
    id: 'tablespace',
    name: 'Tablespace USERS',
    groupId: 'core',
    type: 'SQL',
    value: 71,
    unit: '%',
    rule: { field: 'PCT_USO', operator: '<', limit: 85 },
    incident: { status: 'WARN', value: 81 },
  },
  { id: 'lote', name: 'Último lote contábil', groupId: 'core', type: 'SQL', value: 14, unit: 'min', rule: { field: 'MIN_DESDE', operator: '<', limit: 60 } },
  { id: 'replica', name: 'Atraso da réplica', groupId: 'core', type: 'SQL', value: 2, unit: 's', rule: { field: 'LAG', operator: '<', limit: 30 } },
  { id: 'barramento', name: 'Barramento de eventos', groupId: 'integ', type: 'PING', value: 4, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 100 } },
  { id: 'nf', name: 'Emissão de NF-e', groupId: 'integ', type: 'HTTP', value: 410, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 1500 } },
  { id: 'batch', name: 'Job batch noturno', groupId: 'integ', type: 'PUSH', value: 6, unit: 'h', rule: { field: 'HORAS_DESDE', operator: '<', limit: 26 } },
  { id: 'crm', name: 'Sincronização CRM', groupId: 'integ', type: 'HTTP', value: 520, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 2000 } },
  { id: 'actuator', name: 'Orbit /actuator/health', groupId: 'infra', type: 'HTTP', value: 8, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 300 } },
  { id: 'disco', name: 'Disco servidor app', groupId: 'infra', type: 'PING', value: 62, unit: '%', rule: { field: 'PCT_USO', operator: '<', limit: 90 } },
  { id: 'fila-mq', name: 'Fila MQ', groupId: 'infra', type: 'PING', value: 3, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 50 } },
  { id: 'dns', name: 'DNS interno', groupId: 'infra', type: 'PING', value: 1, unit: 'ms', rule: { field: 'RESPONSE_TIME', operator: '<', limit: 50 } },
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
            id: 'inc-conciliacao',
            monitorId: 'conciliacao',
            severity: 'DOWN',
            openedAt: minutesAgo(now, 4 + 1 / 60),
            acknowledgedBy: null,
            acknowledgedAt: null,
            impact: ['Checkout', 'Repasse a lojistas', 'Relatório diário'],
            escalatesAt: minutesAgo(now, -11),
          },
          {
            id: 'inc-tablespace',
            monitorId: 'tablespace',
            severity: 'WARN',
            openedAt: minutesAgo(now, 27),
            acknowledgedBy: 'R. Lima',
            acknowledgedAt: minutesAgo(now, 20),
            impact: ['Banco Core'],
            escalatesAt: null,
          },
        ]
      : [];

  const timeline: TimelineEvent[] =
    scenario === 'incident'
      ? [
          { id: 'ev-1', at: minutesAgo(now, 4 + 1 / 60), kind: 'DOWN', title: 'Fila de conciliação fora do ar', detail: 'QTD = 349 · regra QTD < 200' },
          { id: 'ev-2', at: minutesAgo(now, 9), kind: 'WARN', title: 'Taxa de erro adquirente em atenção', detail: 'PCT_ERRO = 1,7 · regra PCT_ERRO < 2' },
          { id: 'ev-3', at: minutesAgo(now, 20), kind: 'ACK', title: 'R. Lima reconheceu Tablespace USERS', detail: 'chamado INC-4821' },
          { id: 'ev-4', at: minutesAgo(now, 27), kind: 'WARN', title: 'Tablespace USERS em atenção', detail: 'PCT_USO = 81 · regra PCT_USO < 85' },
          { id: 'ev-5', at: minutesAgo(now, 95), kind: 'OK', title: 'Emissão de NF-e recuperada', detail: 'fora por 6min 12s' },
        ]
      : [
          { id: 'ev-ok-1', at: minutesAgo(now, 95), kind: 'OK', title: 'Emissão de NF-e recuperada', detail: 'fora por 6min 12s' },
          { id: 'ev-ok-2', at: minutesAgo(now, 240), kind: 'INFO', title: 'Janela de manutenção encerrada', detail: 'Banco Core' },
        ];

  return {
    generatedAt: now.toISOString(),
    environment: 'Produção',
    groups: GROUPS,
    monitors,
    incidents,
    timeline,
    uptime24h: scenario === 'incident' ? 99.82 : 99.97,
    lastRecoveryAt: minutesAgo(now, 95),
  };
}
