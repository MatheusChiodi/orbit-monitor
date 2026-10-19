import { describe, expect, it } from 'vitest';
import { THEME_PATHS, tokenValue, withToken } from './paths';
import { ORBIT_DARK } from './registry';

describe('theme token paths', () => {
  it('lists 14 colors, 8 chart series, 7 syntax and 3 FX colors', () => {
    expect(THEME_PATHS).toHaveLength(32);
    expect(THEME_PATHS).toContain('chart.7');
    expect(THEME_PATHS).toContain('syntax.comment');
    expect(THEME_PATHS).toContain('fx.glow');
  });

  it('reads and writes every path without mutating the source', () => {
    for (const path of THEME_PATHS) {
      const next = withToken(ORBIT_DARK, path, '#123456');
      expect(tokenValue(next, path)).toBe('#123456');
      expect(tokenValue(ORBIT_DARK, path)).not.toBe('#123456');
    }
    expect(tokenValue(ORBIT_DARK, 'nope.x')).toBeUndefined();
  });
});
