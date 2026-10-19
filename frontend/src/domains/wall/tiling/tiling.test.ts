import { describe, expect, it } from 'vitest';
import { parseTile, tileViewport } from './tiling';

describe('FE-20 video wall tiling (pure)', () => {
  it('parses ?tile=n/total for 2×1 and 2×2 splits', () => {
    expect(parseTile('?tile=1/2')).toEqual({ index: 1, total: 2, columns: 2, rows: 1 });
    expect(parseTile('?tile=4/4')).toEqual({ index: 4, total: 4, columns: 2, rows: 2 });
  });

  it('invalid or missing tiles mean a single screen', () => {
    for (const search of ['', '?tile=0/2', '?tile=3/2', '?tile=1/3', '?tile=abc', '?tile=1/9']) {
      expect(parseTile(search)).toBeNull();
    }
  });

  it('computes the viewport of one tile over the full wall canvas', () => {
    const canvas = { width: 3840, height: 2160 };
    expect(tileViewport(parseTile('?tile=1/2')!, canvas)).toEqual({ x: 0, y: 0, width: 1920, height: 2160 });
    expect(tileViewport(parseTile('?tile=2/2')!, canvas)).toEqual({ x: 1920, y: 0, width: 1920, height: 2160 });
    expect(tileViewport(parseTile('?tile=3/4')!, canvas)).toEqual({ x: 0, y: 1080, width: 1920, height: 1080 });
    expect(tileViewport(parseTile('?tile=4/4')!, canvas)).toEqual({ x: 1920, y: 1080, width: 1920, height: 1080 });
  });

  it('tiles cover the canvas exactly once', () => {
    const canvas = { width: 3840, height: 2160 };
    const area = [1, 2, 3, 4]
      .map((i) => tileViewport(parseTile(`?tile=${i}/4`)!, canvas))
      .reduce((sum, v) => sum + v.width * v.height, 0);
    expect(area).toBe(canvas.width * canvas.height);
  });
});
