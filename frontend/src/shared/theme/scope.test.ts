import { describe, expect, it } from 'vitest';
import { ORBIT_DARK, builtInTheme } from './registry';
import { SYSTEM_THEME, findTheme, resolveThemeId, themeFromUrl } from './scope';
import type { OrbitTheme } from './types';

const custom: OrbitTheme = { ...ORBIT_DARK, id: 'noc-night', name: 'NOC night', category: 'custom' };

describe('FE-05 theme scope and precedence', () => {
  it('URL > wall layout > device > workspace > Orbit Dark', () => {
    const all = { url: 'nord', layout: 'dracula', device: 'github-light', workspace: 'kanagawa' };
    expect(resolveThemeId(all)).toEqual({ id: 'nord', source: 'url' });
    expect(resolveThemeId({ ...all, url: null })).toEqual({ id: 'dracula', source: 'layout' });
    expect(resolveThemeId({ ...all, url: null, layout: null })).toEqual({ id: 'github-light', source: 'device' });
    expect(resolveThemeId({ workspace: 'kanagawa' })).toEqual({ id: 'kanagawa', source: 'workspace' });
    expect(resolveThemeId({})).toEqual({ id: 'orbit-dark', source: 'default' });
  });

  it('a wall layout theme overrides the console theme', () => {
    expect(resolveThemeId({ device: 'github-light', layout: 'oled-black' }).id).toBe('oled-black');
  });

  it('ignores unknown ids at every level', () => {
    const known = (id: string) => id !== 'gone';
    expect(resolveThemeId({ url: 'gone', layout: 'gone', device: 'nord' }, { exists: known })).toEqual({
      id: 'nord',
      source: 'device',
    });
  });

  it('"system" follows prefers-color-scheme with a light/dark pair', () => {
    expect(resolveThemeId({ device: SYSTEM_THEME, prefersDark: false }).id).toBe('github-light');
    expect(resolveThemeId({ device: SYSTEM_THEME, prefersDark: true }).id).toBe('orbit-dark');
    expect(
      resolveThemeId({ device: SYSTEM_THEME, prefersDark: true, schemePair: { dark: 'nord', light: 'solarized-light' } }).id,
    ).toBe('nord');
  });

  it('reads ?theme= safely', () => {
    expect(themeFromUrl('?theme=tokyo-night')).toBe('tokyo-night');
    expect(themeFromUrl('?theme=%3Cscript%3E')).toBeNull();
    expect(themeFromUrl('')).toBeNull();
  });

  it('finds built-in and custom themes, falling back to Orbit Dark', () => {
    expect(findTheme('nord', [custom])).toBe(builtInTheme('nord'));
    expect(findTheme('noc-night', [custom])).toBe(custom);
    expect(findTheme('missing', [custom])).toBe(ORBIT_DARK);
  });
});
