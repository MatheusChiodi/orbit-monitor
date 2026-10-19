import { msg, type Message } from '@/shared/i18n/message';
import { detectSensitive, type DataClass } from '@/shared/privacy';
import type { VizData } from './types';

/** The 20 display modes of docs/05-extended-features.md §1.1, in order. */
export const DISPLAY_MODES = [
  'big-number',
  'radial-gauge',
  'bullet',
  'headroom-bar',
  'kpi-card',
  'line',
  'area',
  'step-line',
  'bar-ranking',
  'stacked-bar',
  'donut',
  'weekday-hour-heatmap',
  'calendar-heatmap',
  'uptime-ribbon',
  'traffic-light',
  'status-pill',
  'live-table',
  'small-multiples',
  'histogram',
  'hex-grid',
] as const;
export type DisplayModeId = (typeof DISPLAY_MODES)[number];

export type Surface = 'wall' | 'console';

/** Modes that keep values over time; card data never feeds them. */
const SERIES_MODES = new Set<DisplayModeId>(['line', 'area', 'step-line', 'small-multiples', 'calendar-heatmap', 'weekday-hour-heatmap']);

export const MAX_DONUT_SLICES = 6;
/** Runtime history lives in memory: 24 h by default (docs/06). */
export const DEFAULT_HISTORY_HOURS = 24;
const CALENDAR_MIN_HOURS = 48;
const WEEKDAY_MIN_HOURS = 7 * 24;
const RANGE_OPERATORS = new Set(['<', '<=', '>', '>=']);

/** What the data looks like, independent of any mode. */
export interface DataShape {
  numericValue: boolean;
  textValue: boolean;
  status: boolean;
  minMax: boolean;
  target: boolean;
  numericRule: boolean;
  items: number;
  series: 'numeric' | 'text' | null;
  categories: number;
  categoryValues: boolean;
  categorySeries: boolean;
  cells: boolean;
  days: boolean;
  rows: number;
  samples: number;
  segments: number;
  monitors: number;
  historyHours: number | undefined;
  dataClass: DataClass | null;
}

export function dataShape(data: Partial<VizData>): DataShape {
  const value = data.value;
  const points = (data.points ?? []).filter((p) => p.value !== null);
  const categories = data.categories ?? [];
  const textSeries = points.some((p) => typeof p.value === 'string');
  return {
    numericValue: typeof value === 'number',
    textValue: typeof value === 'string',
    // An explicit `value: null` means "no reading yet": the frame state alone is not data.
    status: typeof data.status === 'string' && data.status.length > 0 && value !== null,
    minMax: typeof data.min === 'number' && typeof data.max === 'number' && data.min < data.max,
    target: typeof data.target === 'number',
    numericRule: data.rule !== undefined && RANGE_OPERATORS.has(data.rule.operator),
    items: data.items?.length ?? 0,
    series: points.length === 0 ? null : textSeries ? 'text' : 'numeric',
    categories: categories.length,
    categoryValues: categories.length > 0 && categories.every((c) => c.values !== undefined),
    categorySeries: categories.length > 0 && categories.every((c) => Array.isArray(c.series)),
    cells: (data.cells?.length ?? 0) > 0,
    days: (data.days?.length ?? 0) > 0,
    rows: data.columns && data.rows ? data.rows.length : 0,
    samples: data.samples?.length ?? 0,
    segments: data.segments?.length ?? 0,
    monitors: data.monitors?.length ?? 0,
    historyHours: data.historyHours,
    dataClass: data.dataClass ?? (typeof value === 'string' ? detectSensitive(value) : null),
  };
}

function isEmpty(shape: DataShape): boolean {
  return (
    !shape.numericValue &&
    !shape.textValue &&
    !shape.status &&
    shape.items === 0 &&
    shape.series === null &&
    shape.categories === 0 &&
    !shape.cells &&
    !shape.days &&
    shape.rows === 0 &&
    shape.samples === 0 &&
    shape.segments === 0 &&
    shape.monitors === 0
  );
}

function hours(shape: DataShape): number {
  return shape.historyHours ?? DEFAULT_HISTORY_HOURS;
}

/** Requirement of one mode on the data; `null` means it can draw it. */
function requirement(mode: DisplayModeId, shape: DataShape): Message | null {
  const needsNumber = shape.numericValue ? null : msg('viz.reasons.needsNumber');
  switch (mode) {
    case 'big-number':
      return needsNumber;
    case 'radial-gauge':
      return needsNumber ?? (shape.minMax ? null : msg('viz.reasons.needsMinMax'));
    case 'bullet':
      return needsNumber ?? (shape.target ? null : msg('viz.reasons.needsTarget'));
    case 'headroom-bar':
      return needsNumber ?? (shape.numericRule ? null : msg('viz.reasons.needsNumericRule'));
    case 'kpi-card':
      return shape.items >= 2 ? null : msg('viz.reasons.needsItems');
    case 'line':
    case 'area':
      if (shape.series === null) return msg('viz.reasons.needsSeries');
      return shape.series === 'numeric' ? null : msg('viz.reasons.needsNumber');
    case 'step-line':
      return shape.series === null ? msg('viz.reasons.needsSeries') : null;
    case 'bar-ranking':
      return shape.categories > 0 && !shape.categoryValues ? null : msg('viz.reasons.needsCategories');
    case 'stacked-bar':
      return shape.categoryValues ? null : msg('viz.reasons.needsCategories');
    case 'donut':
      if (shape.categories === 0 || shape.categoryValues) return msg('viz.reasons.needsCategories');
      return shape.categories <= MAX_DONUT_SLICES ? null : msg('viz.reasons.tooManySlices', { max: MAX_DONUT_SLICES });
    case 'weekday-hour-heatmap':
      if (shape.cells) return null;
      if (shape.series !== 'numeric') return msg('viz.reasons.needsSeries');
      return hours(shape) >= WEEKDAY_MIN_HOURS ? null : msg('viz.reasons.needsLongerHistory', { hours: hours(shape) });
    case 'calendar-heatmap':
      if (shape.days) return null;
      if (shape.series !== 'numeric') return msg('viz.reasons.needsSeries');
      return hours(shape) >= CALENDAR_MIN_HOURS ? null : msg('viz.reasons.needsLongerHistory', { hours: hours(shape) });
    case 'uptime-ribbon':
      return shape.segments > 0 ? null : msg('viz.reasons.needsSegments');
    case 'traffic-light':
      return shape.numericValue || shape.textValue || shape.status ? null : msg('viz.reasons.needsStatus');
    case 'status-pill':
      return shape.textValue ? null : msg('viz.reasons.needsText');
    case 'live-table':
      return shape.rows > 0 ? null : msg('viz.reasons.needsRows');
    case 'small-multiples':
      return shape.categorySeries ? null : msg('viz.reasons.needsCategories');
    case 'histogram':
      return shape.samples > 0 ? null : msg('viz.reasons.needsSamples');
    case 'hex-grid':
      return shape.monitors > 0 ? null : msg('viz.reasons.needsMonitors');
  }
}

/** Privacy reason that blocks the whole field on a surface (LGPD / PCI DSS), if any. */
export function privacyReason(shape: DataShape, surface: Surface = 'console'): Message | null {
  const pci = shape.dataClass === 'PCI_PAN' || shape.dataClass === 'PCI_SAD';
  if (surface === 'wall' && pci) return msg('viz.reasons.pci');
  if (surface === 'wall' && shape.dataClass !== null) return msg('viz.reasons.personal');
  return null;
}

export interface CompatibilityOptions {
  surface?: Surface;
}

/** Why `mode` cannot show this data; `null` when it can. */
export function incompatibilityReason(mode: DisplayModeId, shape: DataShape, options: CompatibilityOptions = {}): Message | null {
  const privacy = privacyReason(shape, options.surface);
  if (privacy) return privacy;
  const pci = shape.dataClass === 'PCI_PAN' || shape.dataClass === 'PCI_SAD';
  if (pci && SERIES_MODES.has(mode)) return msg('viz.reasons.pci');
  return requirement(mode, shape);
}

export function compatibleModes(shape: DataShape, options: CompatibilityOptions = {}): DisplayModeId[] {
  if (isEmpty(shape)) return [];
  return DISPLAY_MODES.filter((mode) => incompatibilityReason(mode, shape, options) === null);
}

/** Best mode for the data shape, most specific first. */
function preferred(shape: DataShape): DisplayModeId | null {
  if (shape.monitors > 0) return 'hex-grid';
  if (shape.rows > 0) return 'live-table';
  if (shape.segments > 0) return 'uptime-ribbon';
  if (shape.samples > 0) return 'histogram';
  if (shape.cells) return 'weekday-hour-heatmap';
  if (shape.days) return 'calendar-heatmap';
  if (shape.categorySeries) return 'small-multiples';
  if (shape.categoryValues) return 'stacked-bar';
  if (shape.categories > 0) return 'bar-ranking';
  if (shape.items >= 2) return 'kpi-card';
  if (shape.numericValue && shape.numericRule) return 'headroom-bar';
  if (shape.numericValue && shape.target) return 'bullet';
  if (shape.numericValue && shape.minMax) return 'radial-gauge';
  if (shape.series === 'numeric') return 'line';
  if (shape.series === 'text') return 'step-line';
  if (shape.numericValue) return 'big-number';
  if (shape.textValue) return 'status-pill';
  if (shape.status) return 'traffic-light';
  return null;
}

/** Suggested mode; always one of the compatible modes, `null` when nothing fits. */
export function suggestMode(shape: DataShape, options: CompatibilityOptions = {}): DisplayModeId | null {
  const compatible = compatibleModes(shape, options);
  const best = preferred(shape);
  if (best && compatible.includes(best)) return best;
  return compatible[0] ?? null;
}
