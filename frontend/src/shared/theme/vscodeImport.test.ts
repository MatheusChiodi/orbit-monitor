import { describe, expect, it } from 'vitest';
import { checkPalette } from './contrast';
import { importVsCodeTheme, stripJsonComments } from './vscodeImport';

// Shape of a real `*-color-theme.json`: JSONC with comments and trailing commas.
const SAMPLE = `{
  // Exported from VS Code
  "name": "Harbor Night",
  "type": "dark",
  "colors": {
    "editor.background": "#1b1f27",
    "editor.foreground": "#d7dae0",
    "sideBar.background": "#14171d",
    "activityBar.background": "#101318",
    "panel.border": "#2c313a",
    "descriptionForeground": "#9aa1ad",
    "editorLineNumber.foreground": "#4b5263",
    "focusBorder": "#528bff",
    "terminal.ansiGreen": "#98c379",
    "terminal.ansiYellow": "#e5c07b",
    "terminal.ansiRed": "#e06c75",
    "terminal.ansiBlue": "#61afef",
    "terminal.ansiCyan": "#56b6c2",
    "terminal.ansiMagenta": "#c678dd",
    "editor.selectionBackground": "#3e4451aa", /* alpha */
  },
  "tokenColors": [
    { "scope": ["comment", "punctuation.definition.comment"], "settings": { "foreground": "#5c6370", "fontStyle": "italic" } },
    { "scope": "keyword, storage.type", "settings": { "foreground": "#c678dd" } },
    { "scope": "keyword.operator", "settings": { "foreground": "#56b6c2" } },
    { "scope": "string", "settings": { "foreground": "#98c379" } },
    { "scope": "constant.numeric", "settings": { "foreground": "#d19a66" } },
    { "scope": "entity.name.function", "settings": { "foreground": "#61afef" } },
    { "scope": "variable", "settings": { "foreground": "#e06c75" } },
    { "scope": "string.url", "settings": { "foreground": "url(javascript:alert(1))" } },
  ],
}`;

describe('FE-04 VS Code theme import', () => {
  it('strips comments and trailing commas but keeps strings intact', () => {
    expect(JSON.parse(stripJsonComments('{ "a": "// not a comment", /* x */ "b": [1,], }'))).toEqual({
      a: '// not a comment',
      b: [1],
    });
  });

  it('maps editor, side bar, panel, terminal and token colors to Orbit tokens', () => {
    const result = importVsCodeTheme(SAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { theme } = result;
    expect(theme).toMatchObject({ name: 'Harbor Night', mode: 'dark', category: 'custom' });
    expect(theme.id).toBe('harbor-night');
    expect(theme.colors.s1).toBe('#1b1f27');
    expect(theme.colors.bg).toBe('#101318');
    expect(theme.colors.text).toBe('#d7dae0');
    expect(theme.colors.ok).toBe('#98c379');
    expect(theme.colors.down).toBe('#e06c75');
    expect(theme.colors.info).toBe('#61afef');
    expect(theme.colors.accent).toBe('#528bff');
    expect(theme.colors.line).toBe('#2c313a');
    expect(theme.syntax).toMatchObject({ keyword: '#c678dd', string: '#98c379', number: '#d19a66', function: '#61afef' });
    expect(theme.syntax.operator).toBe('#56b6c2');
    expect(theme.chart).toHaveLength(8);
    expect(new Set(theme.chart).size).toBe(8);
  });

  it('runs the contrast guard and reports every fix it applied', () => {
    const result = importVsCodeTheme(SAMPLE);
    if (!result.ok) throw new Error('import failed');
    expect(checkPalette(result.theme)).toEqual([]);
    // Line numbers (#4b5263) are too dark for `dim` on these surfaces.
    expect(result.fixes).toContainEqual(expect.objectContaining({ token: 'dim', from: '#4b5263' }));
    expect(result.theme.adjusted).toEqual(result.fixes.map((f) => f.token));
    for (const fix of result.fixes) expect(fix.to).not.toBe(fix.from);
  });

  it('never keeps a value that is not a hex color', () => {
    const result = importVsCodeTheme(SAMPLE);
    expect(JSON.stringify(result)).not.toContain('javascript');
  });

  it('detects light themes from the type or the background', () => {
    const light = importVsCodeTheme(JSON.stringify({ name: 'Paper', colors: { 'editor.background': '#fafafa', 'editor.foreground': '#383a42' } }));
    expect(light.ok && light.theme.mode).toBe('light');
    expect(light.ok && checkPalette(light.theme)).toEqual([]);
  });

  it('fills missing colors with safe defaults', () => {
    const bare = importVsCodeTheme(JSON.stringify({ name: 'Bare', colors: { 'editor.background': '#202020' } }));
    expect(bare.ok).toBe(true);
    if (bare.ok) expect(checkPalette(bare.theme)).toEqual([]);
  });

  it('accepts #rgba shorthand', () => {
    const result = importVsCodeTheme(JSON.stringify({ name: 'Short', colors: { 'editor.background': '#222', 'panel.border': '#fff3' } }));
    expect(result.ok && result.theme.colors.line).toBe('#ffffff33');
  });

  it('rejects files without an editor background', () => {
    expect(importVsCodeTheme(JSON.stringify({ name: 'x', colors: {} }))).toEqual({
      ok: false,
      error: { key: 'theme.file.notVsCode' },
    });
    expect(importVsCodeTheme('nope')).toEqual({ ok: false, error: { key: 'theme.file.invalidJson' } });
  });
});
