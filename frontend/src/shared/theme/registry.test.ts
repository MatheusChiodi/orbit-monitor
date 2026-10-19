import { describe, expect, it } from 'vitest';
import { checkPalette } from './contrast';
import { BUILT_IN_THEMES, BUILT_IN_THEME_IDS, DEFAULT_THEME_ID, ORBIT_DARK, builtInTheme, isBuiltInThemeId } from './registry';
import { validateTheme } from './schema';
import { COLOR_TOKENS } from './types';

const PERMISSIVE = ['MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'ISC', 'X11'];

describe('FE-03 built-in themes', () => {
  it('ships Orbit Dark (default), 30 editor-inspired themes and 6 accessibility themes', () => {
    expect(DEFAULT_THEME_ID).toBe('orbit-dark');
    expect(BUILT_IN_THEMES.map((t) => t.id)).toEqual([...BUILT_IN_THEME_IDS]);
    expect(BUILT_IN_THEMES.filter((t) => t.category === 'default')).toHaveLength(1);
    expect(BUILT_IN_THEMES.filter((t) => t.category === 'editor')).toHaveLength(30);
    expect(BUILT_IN_THEMES.filter((t) => t.category === 'accessible')).toHaveLength(6);
    expect(BUILT_IN_THEMES.filter((t) => t.category === 'editor' && t.mode === 'light')).toHaveLength(5);
  });

  it('Orbit Dark mirrors the tokens of docs/03-design.md', () => {
    expect(ORBIT_DARK.colors).toMatchObject({
      bg: '#07090d',
      s1: '#0d1117',
      s2: '#121820',
      s3: '#182029',
      text: '#eef2f7',
      muted: '#8b96a6',
      dim: '#5a6575',
      ok: '#22c55e',
      warn: '#f5a524',
      down: '#ff3b4f',
      info: '#3b9eff',
    });
    expect(ORBIT_DARK.adjusted).toBeUndefined();
  });

  it.each(BUILT_IN_THEMES.map((t) => [t.id, t] as const))('%s matches the theme schema exactly', (_, theme) => {
    expect(Object.keys(theme.colors).sort()).toEqual([...COLOR_TOKENS].sort());
    expect(validateTheme(theme)).toEqual({ ok: true, theme });
  });

  it.each(BUILT_IN_THEMES.map((t) => [t.id, t] as const))('%s passes the contrast guard', (_, theme) => {
    expect(checkPalette(theme)).toEqual([]);
  });

  it.each(BUILT_IN_THEMES.filter((t) => t.category === 'editor').map((t) => [t.id, t] as const))(
    '%s carries attribution under a permissive license',
    (_, theme) => {
      expect(theme.inspiredBy).toBeTruthy();
      expect(theme.author).toBeTruthy();
      expect(PERMISSIVE).toContain(theme.license);
      expect(theme.url).toMatch(/^https:\/\/github\.com\//);
    },
  );

  it.each(BUILT_IN_THEMES.map((t) => [t.id, t] as const))('%s defines 8 distinct categorical series (--viz-1..8)', (_, theme) => {
    expect(theme.chart).toHaveLength(8);
    expect(new Set(theme.chart).size).toBe(8);
  });

  it('color-blind safe themes declare the deficiency they are tuned for', () => {
    expect(builtInTheme('colorblind-deuteranopia')?.cvdTarget).toBe('deuteranopia');
    expect(builtInTheme('colorblind-protanopia')?.cvdTarget).toBe('protanopia');
    expect(builtInTheme('colorblind-tritanopia')?.cvdTarget).toBe('tritanopia');
  });

  it('includes a light and a dark high-contrast theme and an OLED black theme', () => {
    expect(builtInTheme('high-contrast-dark')?.mode).toBe('dark');
    expect(builtInTheme('high-contrast-light')?.mode).toBe('light');
    expect(builtInTheme('oled-black')?.colors.bg).toBe('#000000');
  });

  it('built-in themes are immutable', () => {
    expect(Object.isFrozen(ORBIT_DARK)).toBe(true);
  });

  it('unknown id returns undefined', () => {
    expect(builtInTheme('nope')).toBeUndefined();
    expect(isBuiltInThemeId('nope')).toBe(false);
    expect(isBuiltInThemeId('nord')).toBe(true);
  });
});
