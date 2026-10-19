import { describe, expect, it } from 'vitest';
import { THEME_FILE_MAX_BYTES, THEME_FILE_VERSION, exportTheme, parseThemeFile } from './themeFile';
import { ORBIT_DARK } from './registry';
import type { OrbitTheme } from './types';

const custom: OrbitTheme = {
  ...ORBIT_DARK,
  id: 'noc-blue',
  name: 'NOC blue',
  category: 'custom',
  colors: { ...ORBIT_DARK.colors, info: '#4aa8ff' },
  basedOn: 'orbit-dark',
};
const { author: _a, license: _l, url: _u, ...customWithoutCredits } = custom;
const theme: OrbitTheme = customWithoutCredits;

describe('FE-04 theme import/export', () => {
  it('exports a versioned JSON document', () => {
    const json = JSON.parse(exportTheme(theme));
    expect(json).toEqual({ version: THEME_FILE_VERSION, theme });
  });

  it('round-trips export → import', () => {
    expect(parseThemeFile(exportTheme(theme))).toEqual({ ok: true, theme });
  });

  it('rejects text that is not JSON', () => {
    expect(parseThemeFile('{oops')).toEqual({ ok: false, error: { key: 'theme.file.invalidJson' } });
  });

  it('rejects files that are too large', () => {
    expect(parseThemeFile(' '.repeat(THEME_FILE_MAX_BYTES + 1))).toEqual({ ok: false, error: { key: 'theme.file.tooLarge' } });
  });

  it('rejects documents that fail the schema (missing token)', () => {
    const { info: _info, ...colors } = theme.colors;
    const result = parseThemeFile(JSON.stringify({ version: 1, theme: { ...theme, colors } }));
    expect(result).toEqual({ ok: false, error: { key: 'theme.file.missingToken', params: { token: 'info' } } });
  });

  it('rejects colors that are not hex', () => {
    const bad = { version: 1, theme: { ...theme, colors: { ...theme.colors, bg: 'url(javascript:alert(1))' } } };
    expect(parseThemeFile(JSON.stringify(bad))).toEqual({
      ok: false,
      error: { key: 'theme.file.invalidColor', params: { token: 'bg' } },
    });
  });

  it('rejects a chart palette with the wrong size or a bad syntax color', () => {
    const shortChart = { version: 1, theme: { ...theme, chart: theme.chart.slice(0, 3) } };
    expect(parseThemeFile(JSON.stringify(shortChart))).toMatchObject({ ok: false, error: { params: { token: 'chart' } } });
    const badSyntax = { version: 1, theme: { ...theme, syntax: { ...theme.syntax, string: 'expression(1)' } } };
    expect(parseThemeFile(JSON.stringify(badSyntax))).toMatchObject({
      ok: false,
      error: { key: 'theme.file.invalidColor', params: { token: 'syntax.string' } },
    });
  });

  it('rejects unsupported versions', () => {
    expect(parseThemeFile(JSON.stringify({ version: 99, theme }))).toEqual({
      ok: false,
      error: { key: 'theme.file.unsupportedVersion', params: { version: 99 } },
    });
  });

  it('ignores unknown extra fields instead of keeping them', () => {
    const result = parseThemeFile(JSON.stringify({ version: 1, theme: { ...theme, script: 'x' }, extra: true }));
    expect(result.ok && 'script' in result.theme).toBe(false);
  });

  it('caps the name length and trims it', () => {
    const result = parseThemeFile(JSON.stringify({ version: 1, theme: { ...theme, name: `  ${'x'.repeat(120)}  ` } }));
    expect(result.ok && result.theme.name.length).toBe(60);
  });

  it('drops non-https links', () => {
    const result = parseThemeFile(JSON.stringify({ version: 1, theme: { ...theme, url: 'javascript:alert(1)' } }));
    expect(result.ok && result.theme.url).toBeUndefined();
  });

  it('imported themes are always custom, even when the file claims otherwise', () => {
    const result = parseThemeFile(JSON.stringify({ version: 1, theme: { ...theme, category: 'default' } }));
    expect(result.ok && result.theme.category).toBe('custom');
  });

  it('recognises a VS Code color theme and hands it to the importer', () => {
    const vscode = JSON.stringify({ name: 'Mine', type: 'dark', colors: { 'editor.background': '#1e1e1e' } });
    const result = parseThemeFile(vscode);
    expect(result).toMatchObject({ ok: true, source: 'vscode' });
  });
});
