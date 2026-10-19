import { describe, expect, it } from 'vitest';
import { GRID_COLUMNS, collides, moveBlock, placeBlock, resizeBlock, snapToGrid, type LayoutBlock } from './grid';

function block(id: string, x: number, y: number, w: number, h: number): LayoutBlock {
  return { id, kind: 'matrix', x, y, w, h };
}

describe('FE-11 wall layout grid', () => {
  it('uses a 12-column grid', () => {
    expect(GRID_COLUMNS).toBe(12);
  });

  it('snaps pixel positions to the nearest cell', () => {
    // 1200 px wide grid → 100 px per column; 80 px rows
    expect(snapToGrid({ x: 149, y: 41 }, { width: 1200, rowHeight: 80 })).toEqual({ x: 1, y: 1 });
    expect(snapToGrid({ x: 151, y: 39 }, { width: 1200, rowHeight: 80 })).toEqual({ x: 2, y: 0 });
  });

  it('clamps blocks inside the 12 columns', () => {
    expect(placeBlock([], block('a', 10, 0, 4, 2))).toEqual([block('a', 8, 0, 4, 2)]);
    expect(placeBlock([], block('a', -3, -1, 4, 2))).toEqual([block('a', 0, 0, 4, 2)]);
  });

  it('detects overlapping blocks', () => {
    expect(collides(block('a', 0, 0, 6, 2), block('b', 5, 1, 3, 2))).toBe(true);
    expect(collides(block('a', 0, 0, 6, 2), block('b', 6, 0, 6, 2))).toBe(false);
  });

  it('resolves collisions by pushing other blocks down', () => {
    const layout = [block('hero', 0, 0, 7, 4), block('matrix', 7, 0, 5, 4)];
    const result = moveBlock(layout, 'matrix', { x: 3, y: 0 });
    const hero = result.find((b) => b.id === 'hero');
    const matrix = result.find((b) => b.id === 'matrix');
    expect(matrix).toMatchObject({ x: 3, y: 0 });
    expect(hero?.y).toBeGreaterThanOrEqual(4);
    expect(result.some((a) => result.some((b) => a.id !== b.id && collides(a, b)))).toBe(false);
  });

  it('does not mutate the input layout', () => {
    const layout = [block('a', 0, 0, 6, 2)];
    moveBlock(layout, 'a', { x: 2, y: 0 });
    expect(layout[0]).toEqual(block('a', 0, 0, 6, 2));
  });

  it('resizes with a minimum of 1×1 and never past the right edge', () => {
    const layout = [block('a', 8, 0, 2, 2)];
    expect(resizeBlock(layout, 'a', { w: 10, h: 3 })[0]).toMatchObject({ w: 4, h: 3 });
    expect(resizeBlock(layout, 'a', { w: 0, h: -2 })[0]).toMatchObject({ w: 1, h: 1 });
  });

  it('ignores unknown block ids', () => {
    const layout = [block('a', 0, 0, 2, 2)];
    expect(moveBlock(layout, 'missing', { x: 4, y: 4 })).toEqual(layout);
  });
});
