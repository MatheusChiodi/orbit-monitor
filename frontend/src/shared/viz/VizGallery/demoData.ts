import type { DisplayModeId } from '../compatibility';
import type { VizData, VizPoint } from '../types';

/** Synthetic demo data for the dev gallery only (no real customer data). */
const now = new Date(2026, 9, 18, 17, 0);
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

function wave(count: number, base: number, amp: number, gapAt?: number): VizPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    at: minutesAgo((count - 1 - i) * 2),
    value: i === gapAt ? null : Math.round(base + amp * Math.sin(i / 4) + (i % 5) * 3),
  }));
}

export const DEMO: Record<DisplayModeId, VizData> = {
  'big-number': { label: 'Pending', unit: 'QTY', status: 'OK', value: 349, previous: 300, series: [280, 300, 310, 295, 330, 349] },
  'radial-gauge': { label: 'Disk', unit: '%', status: 'WARN', value: 81, min: 0, max: 100 },
  bullet: { label: 'Throughput', unit: 'tx/min', status: 'OK', value: 120, target: 150, bands: [{ to: 100, status: 'DOWN' }, { to: 140, status: 'WARN' }, { to: 200, status: 'OK' }] },
  'headroom-bar': { label: 'Reconciliation queue', unit: 'QTY', status: 'WARN', value: 160, rule: { field: 'QTY', operator: '<', limit: 200 } },
  'kpi-card': { label: 'Batch', status: 'OK', items: [{ label: 'Pending', value: 12 }, { label: 'Error', value: 3 }, { label: 'Done', value: 1500 }] },
  line: { label: 'Latency', unit: 'ms', status: 'OK', historyHours: 24, points: wave(30, 160, 40, 18), rule: { field: 'RESPONSE_TIME', operator: '<', limit: 260 } },
  area: { label: 'Volume', unit: 'tx', status: 'OK', historyHours: 24, points: wave(30, 1200, 300) },
  'step-line': {
    label: 'Replica state',
    status: 'WARN',
    historyHours: 24,
    points: ['UP', 'UP', 'DEGRADED', 'DEGRADED', 'UP', 'DOWN', 'UP', 'DEGRADED'].map((value, i) => ({ at: minutesAgo((7 - i) * 10), value })),
  },
  'bar-ranking': { label: 'Errors by acquirer', status: 'WARN', categories: [{ name: 'Acquirer A', value: 12 }, { name: 'Acquirer B', value: 30 }, { name: 'Acquirer C', value: 5 }] },
  'stacked-bar': {
    label: 'Authorizations',
    status: 'OK',
    keys: ['approved', 'declined', 'timeout'],
    categories: [
      { name: 'Acquirer A', values: { approved: 90, declined: 10, timeout: 4 } },
      { name: 'Acquirer B', values: { approved: 45, declined: 5, timeout: 1 } },
      { name: 'Acquirer C', values: { approved: 70, declined: 18, timeout: 6 } },
    ],
  },
  donut: { label: 'Share by brand', status: 'OK', categories: ['Brand A', 'Brand B', 'Brand C', 'Brand D', 'Brand E', 'Brand F', 'Brand G'].map((name, i) => ({ name, value: 40 - i * 5 })) },
  'weekday-hour-heatmap': {
    label: 'Errors per hour',
    status: 'OK',
    historyHours: 24 * 7,
    cells: Array.from({ length: 7 * 24 }, (_, i) => ({ weekday: Math.floor(i / 24), hour: i % 24, value: i % 24 > 8 && i % 24 < 19 && i < 120 ? 10 + ((i * 7) % 25) : (i * 3) % 6 })),
  },
  'calendar-heatmap': {
    label: 'Daily uptime',
    unit: '%',
    status: 'OK',
    historyHours: 24,
    days: Array.from({ length: 20 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, value: i % 6 === 3 ? 97.2 : 99.9 })).slice(12),
  },
  'uptime-ribbon': {
    label: 'Checkout API',
    status: 'DOWN',
    historyHours: 24,
    uptime: 99.5,
    segments: [
      { from: minutesAgo(180), to: minutesAgo(90), status: 'OK' },
      { from: minutesAgo(90), to: minutesAgo(80), status: 'WARN' },
      { from: minutesAgo(80), to: minutesAgo(40), status: 'OK' },
      { from: minutesAgo(40), to: minutesAgo(34), status: 'DOWN' },
      { from: minutesAgo(34), to: minutesAgo(0), status: 'OK' },
    ],
  },
  'traffic-light': { label: 'Checkout API', status: 'WARN', value: 182, unit: 'ms' },
  'status-pill': { label: 'Gateway status', status: 'WARN', value: 'DEGRADED', mapping: { UP: 'OK', DEGRADED: 'WARN', DOWN: 'DOWN' } },
  'live-table': {
    label: 'Stuck transactions',
    status: 'WARN',
    columns: ['ID', 'MERCHANT', 'MINUTES'],
    rows: [
      { ID: 'tx-1', MERCHANT: 'Store A', MINUTES: 4 },
      { ID: 'tx-2', MERCHANT: 'Store B', MINUTES: 18 },
      { ID: 'tx-3', MERCHANT: 'Store C', MINUTES: 2 },
    ],
    rule: { field: 'MINUTES', operator: '<', limit: 10 },
  },
  'small-multiples': {
    label: 'Errors by acquirer',
    status: 'OK',
    categories: [
      { name: 'Acquirer A', value: 12, series: [3, 8, 6, 10, 12] },
      { name: 'Acquirer B', value: 30, series: [10, 20, 18, 25, 30] },
      { name: 'Acquirer C', value: 5, series: [9, 7, 6, 6, 5] },
    ],
  },
  histogram: { label: 'Latency distribution', unit: 'ms', status: 'OK', samples: Array.from({ length: 60 }, (_, i) => 80 + ((i * 37) % 120) + (i % 9 === 0 ? 250 : 0)) },
  'hex-grid': {
    label: 'All monitors',
    status: 'DOWN',
    monitors: ['Checkout API', 'Web portal', 'DNS', 'Core DB', 'Queue', 'Auth', 'Search', 'CDN', 'Billing', 'Reports'].map((name, i) => ({
      id: String(i),
      name,
      status: i === 0 ? 'DOWN' : i === 4 ? 'WARN' : 'OK',
    })),
  },
};

/** Field data for the picker demo: a number with min/max, a rule and a short series. */
export const PICKER_DEMO: VizData = {
  label: 'Pending',
  unit: 'QTY',
  status: 'WARN',
  value: 160,
  min: 0,
  max: 250,
  rule: { field: 'QTY', operator: '<', limit: 200 },
  historyHours: 24,
  points: [...wave(19, 140, 20), { at: minutesAgo(0), value: 160 }],
};
