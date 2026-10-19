import { msg, type Message } from '@/shared/i18n/message';
import { isHexColor, normalizeHex } from './color';
import {
  CHART_SIZE,
  COLOR_TOKENS,
  FX_TOKENS,
  SYNTAX_TOKENS,
  THEME_CATEGORIES,
  THEME_ID_PATTERN,
  THEME_MODES,
  THEME_NAME_MAX,
  type CvdTarget,
  type OrbitTheme,
  type ThemeCategory,
  type ThemeChart,
  type ThemeColors,
  type ThemeFx,
  type ThemeMode,
  type ThemeSyntax,
} from './types';

export type ValidationResult = { ok: true; theme: OrbitTheme } | { ok: false; error: Message };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const CVD_TARGETS: readonly CvdTarget[] = ['protanopia', 'deuteranopia', 'tritanopia'];
const TEXT_MAX = 200;
const URL_PATTERN = /^https:\/\/[^\s"'<>]{1,300}$/;

class SchemaError extends Error {
  constructor(readonly detail: Message) {
    super(detail.key);
  }
}

function colorGroup<K extends string>(source: unknown, tokens: readonly K[], prefix: string): Record<K, string> {
  if (!isRecord(source)) throw new SchemaError(msg('theme.file.missingToken', { token: prefix || 'colors' }));
  const out = {} as Record<K, string>;
  for (const token of tokens) {
    const name = prefix ? `${prefix}.${token}` : token;
    const value = source[token];
    if (value === undefined) throw new SchemaError(msg('theme.file.missingToken', { token: name }));
    if (!isHexColor(value)) throw new SchemaError(msg('theme.file.invalidColor', { token: name }));
    out[token] = normalizeHex(value);
  }
  return out;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, TEXT_MAX) : undefined;
}

/** Builds a clean theme from untrusted input: unknown fields are dropped, every color must be hex. */
export function validateTheme(input: unknown): ValidationResult {
  try {
    if (!isRecord(input)) throw new SchemaError(msg('theme.file.invalidTheme'));
    const id = typeof input.id === 'string' ? input.id.trim().toLowerCase() : '';
    if (!THEME_ID_PATTERN.test(id)) throw new SchemaError(msg('theme.file.invalidId'));
    const name = typeof input.name === 'string' ? input.name.trim().slice(0, THEME_NAME_MAX) : '';
    if (!name) throw new SchemaError(msg('theme.file.invalidName'));

    const colors: ThemeColors = colorGroup(input.colors, COLOR_TOKENS, '');
    if (!Array.isArray(input.chart) || input.chart.length !== CHART_SIZE) {
      throw new SchemaError(msg('theme.file.missingToken', { token: 'chart' }));
    }
    const chart = input.chart.map((c, i) => {
      if (!isHexColor(c)) throw new SchemaError(msg('theme.file.invalidColor', { token: `chart.${i}` }));
      return normalizeHex(c);
    }) as unknown as ThemeChart;
    const syntax: ThemeSyntax = colorGroup(input.syntax, SYNTAX_TOKENS, 'syntax');
    const fx: ThemeFx = colorGroup(input.fx, FX_TOKENS, 'fx');

    const mode: ThemeMode = (THEME_MODES as readonly unknown[]).includes(input.mode) ? (input.mode as ThemeMode) : 'dark';
    const category: ThemeCategory = (THEME_CATEGORIES as readonly unknown[]).includes(input.category)
      ? (input.category as ThemeCategory)
      : 'custom';

    const theme: OrbitTheme = { id, name, mode, category, colors, chart, syntax, fx };
    const inspiredBy = optionalText(input.inspiredBy);
    const author = optionalText(input.author);
    const license = optionalText(input.license);
    const basedOn = typeof input.basedOn === 'string' && THEME_ID_PATTERN.test(input.basedOn) ? input.basedOn : undefined;
    if (inspiredBy) theme.inspiredBy = inspiredBy;
    if (author) theme.author = author;
    if (license) theme.license = license;
    if (typeof input.url === 'string' && URL_PATTERN.test(input.url)) theme.url = input.url;
    if (Array.isArray(input.adjusted)) {
      theme.adjusted = input.adjusted.filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 40)).slice(0, 64);
    }
    if ((CVD_TARGETS as readonly unknown[]).includes(input.cvdTarget)) theme.cvdTarget = input.cvdTarget as CvdTarget;
    if (basedOn) theme.basedOn = basedOn;
    return { ok: true, theme };
  } catch (error) {
    if (error instanceof SchemaError) return { ok: false, error: error.detail };
    throw error;
  }
}
