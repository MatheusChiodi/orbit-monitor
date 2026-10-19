/** FE-20: one browser per screen renders its tile of a 2×1 or 2×2 video wall (`?tile=n/total`). */
export interface Tile {
  /** 1-based, row by row. */
  index: number;
  /** 2 (2×1) or 4 (2×2). */
  total: number;
  columns: number;
  rows: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Viewport extends Size {
  x: number;
  y: number;
}

const GRIDS: Record<number, { columns: number; rows: number }> = { 2: { columns: 2, rows: 1 }, 4: { columns: 2, rows: 2 } };

export function parseTile(search: string): Tile | null {
  const match = /^(\d+)\/(\d+)$/.exec(new URLSearchParams(search).get('tile') ?? '');
  if (!match) return null;
  const index = Number(match[1]);
  const total = Number(match[2]);
  const grid = GRIDS[total];
  if (!grid || index < 1 || index > total) return null;
  return { index, total, ...grid };
}

/** Region of the full wall canvas that this tile shows. */
export function tileViewport(tile: Tile, canvas: Size): Viewport {
  const width = canvas.width / tile.columns;
  const height = canvas.height / tile.rows;
  const position = tile.index - 1;
  return { x: (position % tile.columns) * width, y: Math.floor(position / tile.columns) * height, width, height };
}
