/** FE-11: wall layouts live on a 12-column grid; rows grow downwards. */
export const GRID_COLUMNS = 12;

export type BlockKind =
  | 'hero'
  | 'also-active'
  | 'near-limit'
  | 'matrix'
  | 'timeline'
  | 'value'
  | 'indicators'
  | 'series'
  | 'live-table'
  | 'ranking'
  | 'uptime'
  | 'clock'
  | 'text';

export interface LayoutBlock {
  id: string;
  kind: BlockKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Live tables may never expose personal data on the wall. */
  allowPersonalData?: boolean;
}

export interface GridMetrics {
  width: number;
  rowHeight: number;
}

/** Nearest cell for a pixel position. */
export function snapToGrid(point: { x: number; y: number }, metrics: GridMetrics): { x: number; y: number } {
  const column = metrics.width / GRID_COLUMNS;
  return {
    x: Math.max(0, Math.min(GRID_COLUMNS - 1, Math.round(point.x / column))),
    y: Math.max(0, Math.round(point.y / metrics.rowHeight)),
  };
}

function clamp(block: LayoutBlock): LayoutBlock {
  const w = Math.max(1, Math.min(GRID_COLUMNS, Math.round(block.w)));
  const h = Math.max(1, Math.round(block.h));
  const x = Math.max(0, Math.min(GRID_COLUMNS - w, Math.round(block.x)));
  const y = Math.max(0, Math.round(block.y));
  return { ...block, x, y, w, h };
}

export function collides(a: LayoutBlock, b: LayoutBlock): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Keeps `fixed` where it is and pushes every block it overlaps downwards (cascading),
 * so the layout never has overlaps.
 */
function resolve(layout: readonly LayoutBlock[], fixed: LayoutBlock): LayoutBlock[] {
  const placed: LayoutBlock[] = [fixed];
  const others = layout.filter((b) => b.id !== fixed.id).sort((a, b) => a.y - b.y || a.x - b.x);
  for (const original of others) {
    let block = { ...original };
    while (placed.some((p) => collides(p, block))) {
      const blocker = placed.filter((p) => collides(p, block)).reduce((low, p) => Math.max(low, p.y + p.h), 0);
      block = { ...block, y: blocker };
    }
    placed.push(block);
  }
  const order = new Map(layout.map((b, i) => [b.id, i]));
  return placed.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Adds (or replaces) a block, clamped inside the grid, resolving collisions. */
export function placeBlock(layout: readonly LayoutBlock[], block: LayoutBlock): LayoutBlock[] {
  const clamped = clamp(block);
  const rest = layout.filter((b) => b.id !== block.id);
  return resolve([...rest, clamped], clamped);
}

export function moveBlock(layout: readonly LayoutBlock[], id: string, to: { x: number; y: number }): LayoutBlock[] {
  const current = layout.find((b) => b.id === id);
  if (!current) return [...layout];
  return resolve(layout, clamp({ ...current, x: to.x, y: to.y }));
}

export function resizeBlock(layout: readonly LayoutBlock[], id: string, size: { w: number; h: number }): LayoutBlock[] {
  const current = layout.find((b) => b.id === id);
  if (!current) return [...layout];
  const w = Math.max(1, Math.min(GRID_COLUMNS - current.x, Math.round(size.w)));
  return resolve(layout, clamp({ ...current, w, h: size.h }));
}
