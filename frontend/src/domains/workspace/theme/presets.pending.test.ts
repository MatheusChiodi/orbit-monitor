import { describe, expect, it } from 'vitest';
import { checkTheme } from './contrast';
import { DEFAULT_THEME_ID, THEME_PRESETS, THEME_TOKENS, presetById } from './presets';

describe('FE-03 theme presets', () => {
  it('ships Orbit Dark (default), Light, High contrast, OLED black and three color-blind safe presets', () => {
    expect(THEME_PRESETS.map((p) => p.id)).toEqual([
      'orbit-dark',
      'light',
      'high-contrast',
      'oled-black',
      'deuteranopia',
      'protanopia',
      'tritanopia',
    ]);
    expect(DEFAULT_THEME_ID).toBe('orbit-dark');
  });

  it('Orbit Dark mirrors the tokens of docs/03-design.md', () => {
    const dark = presetById('orbit-dark');
    expect(dark?.colors).toMatchObject({
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
  });

  it('every preset defines every token', () => {
    for (const preset of THEME_PRESETS) {
      expect(Object.keys(preset.colors).sort()).toEqual([...THEME_TOKENS].sort());
    }
  });

  it.each(THEME_PRESETS.map((p) => [p.id, p] as const))('%s passes the contrast guard', (_, preset) => {
    expect(checkTheme(preset.colors)).toEqual([]);
  });

  it('presets have translatable names', () => {
    expect(presetById('high-contrast')?.nameKey).toBe('theme.presets.high-contrast');
  });

  it('unknown id returns undefined', () => {
    expect(presetById('nope')).toBeUndefined();
  });
});
