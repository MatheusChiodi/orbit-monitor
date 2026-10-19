import { describe, expect, it } from 'vitest';
import {
  DISPLAY_MODES,
  compatibleModes,
  dataShape,
  incompatibilityReason,
  suggestMode,
  type DisplayModeId,
} from './compatibility';

const SERIES_MODES: DisplayModeId[] = ['line', 'area', 'step-line', 'small-multiples', 'calendar-heatmap', 'weekday-hour-heatmap'];

describe('FE-22 compatibility rules', () => {
  it('knows the 20 display modes of docs/05 §1.1 in order', () => {
    expect(DISPLAY_MODES).toEqual([
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
    ]);
  });

  it('a single number suggests the big number and enables only numeric modes', () => {
    const shape = dataShape({ value: 349 });
    expect(suggestMode(shape)).toBe('big-number');
    expect(compatibleModes(shape)).toEqual(expect.arrayContaining(['big-number', 'traffic-light']));
    expect(compatibleModes(shape)).not.toContain('donut');
    expect(compatibleModes(shape)).not.toContain('live-table');
  });

  it('min/max suggests the radial gauge; a target with bands suggests the bullet chart', () => {
    expect(suggestMode(dataShape({ value: 81, min: 0, max: 100 }))).toBe('radial-gauge');
    expect(suggestMode(dataShape({ value: 120, target: 150, bands: [{ to: 100 }, { to: 200 }] }))).toBe('bullet');
  });

  it('a numeric rule enables the headroom bar', () => {
    const shape = dataShape({ value: 160, rule: { field: 'QTY', operator: '<', limit: 200 } });
    expect(compatibleModes(shape)).toContain('headroom-bar');
  });

  it('an equality rule cannot use the headroom bar', () => {
    const shape = dataShape({ value: 0, rule: { field: 'ROWS', operator: '==', limit: 0 } });
    expect(compatibleModes(shape)).not.toContain('headroom-bar');
  });

  it('several numbers in one row suggest the KPI card', () => {
    expect(suggestMode(dataShape({ items: [{ label: 'Pending', value: 1 }, { label: 'Error', value: 2 }] }))).toBe('kpi-card');
  });

  it('a stored numeric series suggests the line chart and enables area', () => {
    const shape = dataShape({ points: [{ at: '2026-10-18T17:00:00Z', value: 1 }, { at: '2026-10-18T17:01:00Z', value: 2 }] });
    expect(suggestMode(shape)).toBe('line');
    expect(compatibleModes(shape)).toEqual(expect.arrayContaining(['line', 'area', 'step-line']));
  });

  it('a series of text states suggests the step line', () => {
    const shape = dataShape({ points: [{ at: '2026-10-18T17:00:00Z', value: 'UP' }, { at: '2026-10-18T17:01:00Z', value: 'DOWN' }] });
    expect(suggestMode(shape)).toBe('step-line');
    expect(compatibleModes(shape)).not.toContain('area');
  });

  it('category + number suggests the ranking; donut only up to 6 slices', () => {
    const few = dataShape({ categories: [{ name: 'a', value: 1 }, { name: 'b', value: 2 }] });
    expect(suggestMode(few)).toBe('bar-ranking');
    expect(compatibleModes(few)).toContain('donut');
    const many = dataShape({ categories: Array.from({ length: 9 }, (_, i) => ({ name: `c${i}`, value: i })) });
    expect(compatibleModes(many)).not.toContain('donut');
    expect(incompatibilityReason('donut', many)).toEqual({ key: 'viz.reasons.tooManySlices', params: { max: 6 } });
  });

  it('category + several numbers enables the stacked bar; category + series enables small multiples', () => {
    expect(compatibleModes(dataShape({ categories: [{ name: 'a', values: { ok: 1, error: 2 } }] }))).toContain('stacked-bar');
    expect(compatibleModes(dataShape({ categories: [{ name: 'a', value: 3, series: [1, 2, 3] }] }))).toContain('small-multiples');
  });

  it('a text field suggests the status pill and disables numeric modes with a reason', () => {
    const shape = dataShape({ value: 'UP' });
    expect(suggestMode(shape)).toBe('status-pill');
    expect(compatibleModes(shape)).not.toContain('big-number');
    expect(incompatibilityReason('big-number', shape)).toEqual({ key: 'viz.reasons.needsNumber' });
  });

  it('several rows suggest the live table', () => {
    expect(suggestMode(dataShape({ rows: [{ ID: 1 }, { ID: 2 }], columns: ['ID'] }))).toBe('live-table');
  });

  it('latency samples suggest the histogram, up/down history the uptime ribbon, many monitors the hex grid', () => {
    expect(suggestMode(dataShape({ samples: [1, 2, 3, 4] }))).toBe('histogram');
    expect(suggestMode(dataShape({ segments: [{ from: 'a', to: 'b', status: 'OK' }] }))).toBe('uptime-ribbon');
    expect(suggestMode(dataShape({ monitors: [{ id: 'a', name: 'A', status: 'OK' }] }))).toBe('hex-grid');
  });

  it('only "is it ok" data suggests the traffic light', () => {
    expect(suggestMode(dataShape({ status: 'OK' }))).toBe('traffic-light');
  });

  it('the suggested mode is always among the compatible ones', () => {
    const shapes = [
      dataShape({ value: 349 }),
      dataShape({ value: 'UP' }),
      dataShape({ categories: [{ name: 'a', value: 1 }] }),
      dataShape({ rows: [{ ID: 1 }], columns: ['ID'] }),
    ];
    for (const shape of shapes) expect(compatibleModes(shape)).toContain(suggestMode(shape));
  });

  it('series modes say how much history exists (memory only, 24 h)', () => {
    const shape = dataShape({ points: [{ at: '2026-10-18T17:00:00Z', value: 1 }], historyHours: 24 });
    expect(shape.historyHours).toBe(24);
    expect(incompatibilityReason('calendar-heatmap', shape)).toEqual({ key: 'viz.reasons.needsLongerHistory', params: { hours: 24 } });
  });

  it('card data (PCI) can never be stored as a series nor placed on the wall', () => {
    const shape = dataShape({ value: '•••• •••• •••• 1111', dataClass: 'PCI_PAN' });
    for (const mode of SERIES_MODES) expect(compatibleModes(shape)).not.toContain(mode);
    expect(compatibleModes(shape, { surface: 'wall' })).toEqual([]);
    expect(incompatibilityReason('line', shape)).toEqual({ key: 'viz.reasons.pci' });
  });

  it('personal data (LGPD) is never placed on the wall', () => {
    const shape = dataShape({ value: 'j•••@d•••.com', dataClass: 'PERSONAL' });
    expect(compatibleModes(shape, { surface: 'wall' })).toEqual([]);
    expect(compatibleModes(shape, { surface: 'console' })).toContain('status-pill');
  });

  it('an empty result has no compatible mode and suggests nothing', () => {
    const shape = dataShape({});
    expect(compatibleModes(shape)).toEqual([]);
    expect(suggestMode(shape)).toBeNull();
  });
});
