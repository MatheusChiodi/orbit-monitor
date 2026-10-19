import { msg, type Message } from '@/shared/i18n/message';
import { validateTheme } from './schema';
import type { OrbitTheme } from './types';
import { importVsCodeTheme, stripJsonComments, type ThemeFix } from './vscodeImport';

/** FE-04: Orbit theme file `{ version, theme }`, same theme shape as `orbit.themes.json` items. */
export const THEME_FILE_VERSION = 1;
export const THEME_FILE_MAX_BYTES = 256_000;

export type ThemeFileResult =
  | { ok: true; theme: OrbitTheme }
  | { ok: true; theme: OrbitTheme; source: 'vscode'; fixes: ThemeFix[] }
  | { ok: false; error: Message };

export function exportTheme(theme: OrbitTheme): string {
  return `${JSON.stringify({ version: THEME_FILE_VERSION, theme }, null, 2)}\n`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Accepts an Orbit theme file or a VS Code color theme; the result is always a custom theme. */
export function parseThemeFile(text: string): ThemeFileResult {
  if (text.length > THEME_FILE_MAX_BYTES) return { ok: false, error: msg('theme.file.tooLarge') };
  let doc: unknown;
  try {
    doc = JSON.parse(stripJsonComments(text));
  } catch {
    return { ok: false, error: msg('theme.file.invalidJson') };
  }
  if (isRecord(doc) && !('theme' in doc) && (isRecord(doc.colors) || Array.isArray(doc.tokenColors))) {
    const imported = importVsCodeTheme(text);
    return imported.ok ? { ...imported, source: 'vscode' } : imported;
  }
  if (!isRecord(doc)) return { ok: false, error: msg('theme.file.invalidTheme') };
  if (doc.version !== THEME_FILE_VERSION) {
    const version = typeof doc.version === 'number' || typeof doc.version === 'string' ? doc.version : '?';
    return { ok: false, error: msg('theme.file.unsupportedVersion', { version }) };
  }
  const result = validateTheme(isRecord(doc.theme) ? { ...doc.theme, category: 'custom' } : doc.theme);
  return result.ok ? { ok: true, theme: result.theme } : result;
}
