import { afterEach, describe, expect, it, vi } from 'vitest';
import { contrastRatio } from './contrast';
import { THEME_TRANSITION_MS, applyTheme, themeVariables } from './applyTheme';
import { ORBIT_DARK, builtInTheme } from './registry';

const light = builtInTheme('github-light')!;
const oled = builtInTheme('oled-black')!;

afterEach(() => {
  vi.useRealTimers();
});

describe('FE-05 applyTheme', () => {
  it('writes every token as a CSS variable on the target element', () => {
    const el = document.createElement('div');
    applyTheme(oled, el);
    expect(el.style.getPropertyValue('--bg')).toBe(oled.colors.bg);
    expect(el.style.getPropertyValue('--down')).toBe(oled.colors.down);
    expect(el.style.getPropertyValue('--line-2')).toBe(oled.colors.line2);
    expect(el.style.getPropertyValue('--accent')).toBe(oled.colors.accent);
    expect(el.style.getPropertyValue('--chart-1')).toBe(oled.chart[0]);
    expect(el.style.getPropertyValue('--chart-8')).toBe(oled.chart[7]);
    // shared/viz reads the same categorical palette as --viz-1..8.
    for (let i = 0; i < 8; i++) expect(el.style.getPropertyValue(`--viz-${i + 1}`)).toBe(oled.chart[i]);
    expect(el.style.getPropertyValue('--syntax-keyword')).toBe(oled.syntax.keyword);
    expect(el.style.getPropertyValue('--fx-from')).toBe(oled.fx.from);
    expect(el.style.getPropertyValue('--fx-glow')).toBe(oled.fx.glow);
    expect(el.dataset.theme).toBe('oled-black');
  });

  it('sets color-scheme from the background luminance', () => {
    const el = document.createElement('div');
    applyTheme(light, el);
    expect(el.style.colorScheme).toBe('light');
    applyTheme(ORBIT_DARK, el);
    expect(el.style.colorScheme).toBe('dark');
  });

  it('derives readable text colors for state backgrounds', () => {
    for (const theme of [ORBIT_DARK, light]) {
      const vars = themeVariables(theme);
      for (const status of ['ok', 'warn', 'down'] as const) {
        expect(contrastRatio(vars[`--${status}-text`]!, theme.colors.s1)).toBeGreaterThanOrEqual(4.5);
      }
    }
    // Dark themes get light variants, as in docs/03-design.md (`#ffb3ba` for DOWN).
    expect(themeVariables(ORBIT_DARK)['--down-text']).toMatch(/^#ff[a-f][0-9a-f]{3}$/);
  });

  it('cross-fades colors for 280 ms when animations are on', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    applyTheme(light, el, { animate: true });
    expect(el.dataset.themeTransition).toBe('');
    vi.advanceTimersByTime(THEME_TRANSITION_MS + 20);
    expect(el.dataset.themeTransition).toBeUndefined();
    expect(THEME_TRANSITION_MS).toBe(280);
  });

  it('changes instantly when animations are off (FE-06)', () => {
    const el = document.createElement('div');
    applyTheme(light, el, { animate: false });
    expect(el.dataset.themeTransition).toBeUndefined();
  });
});
