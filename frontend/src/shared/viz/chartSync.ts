import { createStore, type StoreApi } from 'zustand/vanilla';

export interface TimeRange {
  from: string;
  to: string;
}

/** FE-27: charts of the same group (usually a page) share one crosshair time and one zoom range. */
export interface ChartSyncState {
  crosshairs: Record<string, string>;
  zooms: Record<string, TimeRange>;
  crosshair: (group: string) => string | null;
  setCrosshair: (group: string, at: string) => void;
  clearCrosshair: (group: string) => void;
  zoom: (group: string) => TimeRange | null;
  setZoom: (group: string, range: TimeRange) => void;
  resetZoom: (group: string) => void;
}

export type ChartSyncStore = StoreApi<ChartSyncState>;

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function createChartSyncStore(): ChartSyncStore {
  return createStore<ChartSyncState>()((set, get) => ({
    crosshairs: {},
    zooms: {},
    crosshair: (group) => get().crosshairs[group] ?? null,
    setCrosshair: (group, at) => set((s) => ({ crosshairs: { ...s.crosshairs, [group]: at } })),
    clearCrosshair: (group) => set((s) => ({ crosshairs: without(s.crosshairs, group) })),
    zoom: (group) => get().zooms[group] ?? null,
    setZoom: (group, range) => set((s) => ({ zooms: { ...s.zooms, [group]: range } })),
    resetZoom: (group) => set((s) => ({ zooms: without(s.zooms, group) })),
  }));
}

/** Store shared by every chart that does not receive its own. */
export const chartSync = createChartSyncStore();

export const MIN_ZOOM_MS = 5 * 60_000;

/**
 * Keeps a zoom inside the history that exists (memory only) with at least 5 minutes of span.
 * Unchanged edges keep their original strings.
 */
export function clampZoom(range: TimeRange, available: TimeRange): TimeRange {
  let [from, to] = Date.parse(range.from) <= Date.parse(range.to) ? [range.from, range.to] : [range.to, range.from];
  const minAt = Date.parse(available.from);
  const maxAt = Date.parse(available.to);
  if (Date.parse(from) < minAt) from = available.from;
  if (Date.parse(to) > maxAt) to = available.to;
  if (Date.parse(to) - Date.parse(from) < MIN_ZOOM_MS) {
    let end = Math.min(Date.parse(from) + MIN_ZOOM_MS, maxAt);
    const start = Math.max(end - MIN_ZOOM_MS, minAt);
    end = Math.min(start + MIN_ZOOM_MS, maxAt);
    from = new Date(start).toISOString();
    to = new Date(end).toISOString();
  }
  return { from, to };
}
