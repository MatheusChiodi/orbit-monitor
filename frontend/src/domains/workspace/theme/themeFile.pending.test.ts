import { describe, expect, it } from 'vitest';
import { THEME_FILE_VERSION, exportTheme, parseThemeFile } from './themeFile';
import { ORBIT_DARK } from './presets';

const custom = { id: 'noc-blue', name: 'NOC blue', colors: { ...ORBIT_DARK.colors, info: '#4aa8ff' } };

describe('FE-04 theme import/export', () => {
  it('exports a versioned JSON document', () => {
    const json = JSON.parse(exportTheme(custom));
    expect(json).toEqual({ version: THEME_FILE_VERSION, theme: custom });
  });

  it('round-trips export → import', () => {
    expect(parseThemeFile(exportTheme(custom))).toEqual({ ok: true, theme: custom });
  });

  it('rejects text that is not JSON', () => {
    expect(parseThemeFile('{oops')).toEqual({ ok: false, error: { key: 'theme.file.invalidJson' } });
  });

  it('rejects documents that fail the schema (missing token)', () => {
    const { info: _info, ...colors } = custom.colors;
    const result = parseThemeFile(JSON.stringify({ version: 1, theme: { ...custom, colors } }));
    expect(result).toEqual({ ok: false, error: { key: 'theme.file.missingToken', params: { token: 'info' } } });
  });

  it('rejects colors that are not hex', () => {
    const bad = { version: 1, theme: { ...custom, colors: { ...custom.colors, bg: 'url(javascript:alert(1))' } } };
    expect(parseThemeFile(JSON.stringify(bad))).toEqual({
      ok: false,
      error: { key: 'theme.file.invalidColor', params: { token: 'bg' } },
    });
  });

  it('rejects unsupported versions', () => {
    expect(parseThemeFile(JSON.stringify({ version: 99, theme: custom }))).toEqual({
      ok: false,
      error: { key: 'theme.file.unsupportedVersion', params: { version: 99 } },
    });
  });

  it('ignores unknown extra fields instead of keeping them', () => {
    const result = parseThemeFile(JSON.stringify({ version: 1, theme: { ...custom, script: 'x' }, extra: true }));
    expect(result.ok && 'script' in result.theme).toBe(false);
  });

  it('caps the name length and trims it', () => {
    const result = parseThemeFile(JSON.stringify({ version: 1, theme: { ...custom, name: `  ${'x'.repeat(120)}  ` } }));
    expect(result.ok && result.theme.name.length).toBe(60);
  });
});
