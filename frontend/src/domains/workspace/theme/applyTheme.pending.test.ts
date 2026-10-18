import { describe, expect, it } from 'vitest';
import { applyTheme, resolveTheme } from './applyTheme';
import { ORBIT_DARK, presetById } from './presets';

const light = presetById('light')!;
const oled = presetById('oled-black')!;

describe('FE-05 per-layout theme', () => {
  it('a wall layout theme overrides the console theme', () => {
    expect(resolveTheme({ console: light, layout: oled })).toBe(oled);
  });

  it('falls back to the console theme, then to Orbit Dark', () => {
    expect(resolveTheme({ console: light, layout: null })).toBe(light);
    expect(resolveTheme({ console: null, layout: null })).toBe(ORBIT_DARK);
  });

  it('applyTheme writes every token as a CSS variable on the target element', () => {
    const el = document.createElement('div');
    applyTheme(oled, el);
    expect(el.style.getPropertyValue('--bg')).toBe(oled.colors.bg);
    expect(el.style.getPropertyValue('--down')).toBe(oled.colors.down);
    expect(el.style.getPropertyValue('--line-2')).toBe(oled.colors.line2);
    expect(el.dataset.theme).toBe('oled-black');
  });

  it('applyTheme sets color-scheme from the background luminance', () => {
    const el = document.createElement('div');
    applyTheme(light, el);
    expect(el.style.colorScheme).toBe('light');
    applyTheme(ORBIT_DARK, el);
    expect(el.style.colorScheme).toBe('dark');
  });
});
