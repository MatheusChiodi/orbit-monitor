import { msg, type Message } from '@/shared/i18n/message';
import { deltaE, isHexColor, luminance, mix, normalizeHex, shiftLightness, toOkLab, withAlpha } from './color';
import { fixTheme, suggestReadable } from './contrast';
import { tokenValue } from './paths';
import { CHART_SIZE, THEME_NAME_MAX, type OrbitTheme, type ThemeChart, type ThemeColors, type ThemeMode, type ThemeSyntax } from './types';

/**
 * FE-04: maps a VS Code color theme (`*-color-theme.json`, JSONC) to an Orbit theme, then runs the
 * contrast guard and reports each fix so the user can review it before saving. Only hex values are
 * read; everything else in the file is ignored.
 */
export const VSCODE_FILE_MAX_BYTES = 1_000_000;

export interface ThemeFix {
  token: string;
  from: string;
  to: string;
}

export type VsCodeImportResult = { ok: true; theme: OrbitTheme; fixes: ThemeFix[] } | { ok: false; error: Message };

/** Removes `//` and `/* *\/` comments and trailing commas outside of strings. */
export function stripJsonComments(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      out += c;
      i++;
    }
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);

/** VS Code also allows `#rgba`; returns a normalized hex or undefined. */
function hex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (/^#[0-9a-f]{4}$/i.test(value)) return normalizeHex(`#${[...value.slice(1)].map((c) => c + c).join('')}`);
  return isHexColor(value) ? normalizeHex(value) : undefined;
}

const opaque = (color: string, under: string) => (color.length === 9 ? withAlpha(color, under) : color);

function slug(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return base || 'imported-theme';
}

const SYNTAX_SCOPES: Record<keyof ThemeSyntax, readonly string[]> = {
  keyword: ['keyword', 'storage.type', 'storage', 'keyword.control'],
  string: ['string', 'string.quoted'],
  number: ['constant.numeric', 'constant'],
  comment: ['comment'],
  function: ['entity.name.function', 'support.function'],
  operator: ['keyword.operator'],
  identifier: ['variable', 'variable.other', 'variable.other.readwrite'],
};

function tokenColor(rules: readonly Dict[], targets: readonly string[]): string | undefined {
  const scopesOf = (rule: Dict) => {
    const scope = rule.scope;
    const list = Array.isArray(scope) ? scope : typeof scope === 'string' ? scope.split(',') : [];
    return list.filter((s): s is string => typeof s === 'string').map((s) => s.trim());
  };
  const colorOf = (rule: Dict) => (isDict(rule.settings) ? hex(rule.settings.foreground) : undefined);
  for (const target of targets) {
    const exact = rules.find((r) => scopesOf(r).includes(target) && colorOf(r));
    if (exact) return colorOf(exact);
  }
  for (const target of targets) {
    const nested = rules.find((r) => scopesOf(r).some((s) => s.startsWith(`${target}.`)) && colorOf(r));
    if (nested) return colorOf(nested);
  }
  return undefined;
}

const FALLBACK = { ok: '#22c55e', warn: '#f5a524', down: '#ff3b4f', info: '#3b9eff', purple: '#a78bfa', cyan: '#22d3ee' };

export function importVsCodeTheme(text: string): VsCodeImportResult {
  if (text.length > VSCODE_FILE_MAX_BYTES) return { ok: false, error: msg('theme.file.tooLarge') };
  let doc: unknown;
  try {
    doc = JSON.parse(stripJsonComments(text));
  } catch {
    return { ok: false, error: msg('theme.file.invalidJson') };
  }
  if (!isDict(doc) || !isDict(doc.colors)) return { ok: false, error: msg('theme.file.notVsCode') };
  const c = doc.colors;
  const get = (...keys: string[]) => keys.map((k) => hex(c[k])).find(Boolean);
  const editor = get('editor.background');
  if (!editor) return { ok: false, error: msg('theme.file.notVsCode') };

  const s1 = opaque(editor, '#000000');
  const declared = typeof doc.type === 'string' ? doc.type.toLowerCase() : '';
  const mode: ThemeMode = declared === 'light' || declared === 'hclight' ? 'light' : declared ? 'dark' : luminance(s1) > 0.4 ? 'light' : 'dark';
  const dark = mode === 'dark';
  const L = (x: string) => toOkLab(x).L;

  const darker = ['sideBar.background', 'activityBar.background', 'panel.background', 'titleBar.activeBackground']
    .map((k) => get(k))
    .filter((x): x is string => Boolean(x))
    .map((x) => opaque(x, s1))
    .filter((x) => L(x) < L(s1) - 0.008);
  const bg = darker.length ? darker.reduce((a, b) => (L(a) < L(b) ? a : b)) : shiftLightness(s1, dark ? -0.035 : -0.03);

  const rules = Array.isArray(doc.tokenColors) ? doc.tokenColors.filter(isDict) : [];
  const text0 = opaque(get('editor.foreground', 'foreground') ?? (dark ? '#e6e6e6' : '#1f1f1f'), s1);
  const comment = tokenColor(rules, SYNTAX_SCOPES.comment);
  const info = get('terminal.ansiBlue', 'editorInfo.foreground', 'textLink.foreground') ?? FALLBACK.info;
  const colors: ThemeColors = {
    bg,
    s1,
    s2: shiftLightness(s1, dark ? 0.03 : -0.025),
    s3: shiftLightness(s1, dark ? 0.06 : -0.05),
    line: get('panel.border', 'editorGroup.border', 'sideBar.border') ?? `${text0}${dark ? '12' : '1f'}`,
    line2: `${text0}${dark ? '21' : '33'}`,
    text: text0,
    muted: opaque(get('descriptionForeground') ?? mix(text0, s1, 0.3), s1),
    dim: opaque(get('editorLineNumber.foreground') ?? comment ?? mix(text0, s1, 0.45), s1),
    ok: opaque(get('terminal.ansiGreen', 'gitDecoration.addedResourceForeground', 'testing.iconPassed') ?? FALLBACK.ok, s1),
    warn: opaque(get('terminal.ansiYellow', 'editorWarning.foreground', 'list.warningForeground') ?? FALLBACK.warn, s1),
    down: opaque(get('terminal.ansiRed', 'editorError.foreground', 'errorForeground') ?? FALLBACK.down, s1),
    info: opaque(info, s1),
    accent: opaque(get('focusBorder', 'button.background', 'activityBarBadge.background') ?? info, s1),
  };

  const syntax = {} as ThemeSyntax;
  for (const key of Object.keys(SYNTAX_SCOPES) as (keyof ThemeSyntax)[]) {
    syntax[key] = opaque(tokenColor(rules, SYNTAX_SCOPES[key]) ?? (key === 'comment' ? colors.dim : text0), s1);
  }

  const purple = get('terminal.ansiMagenta', 'charts.purple') ?? FALLBACK.purple;
  // Same order as the shared/viz categorical palette: blue, orange, teal, yellow, purple, green, accent, red.
  const pool = [
    get('charts.blue') ?? colors.info,
    get('charts.orange') ?? syntax.number,
    get('terminal.ansiCyan') ?? FALLBACK.cyan,
    get('charts.yellow') ?? colors.warn,
    purple,
    get('charts.green') ?? colors.ok,
    colors.accent,
    get('charts.red') ?? colors.down,
    syntax.keyword,
    syntax.string,
    syntax.function,
  ].map((x) => suggestReadable(opaque(x, s1), s1, 3.02));
  const extra = pool.flatMap((x) => [shiftLightness(x, 0.09), shiftLightness(x, -0.09), shiftLightness(x, 0.16)]).map((x) => suggestReadable(x, s1, 3.02));
  const chart: string[] = [];
  for (const min of [0.09, 0.075, 0.065]) {
    for (const x of [...pool, ...extra]) if (chart.length < CHART_SIZE && chart.every((y) => deltaE(x, y) >= min)) chart.push(x);
  }
  while (chart.length < CHART_SIZE) chart.push(suggestReadable(mix(colors.accent, colors.text, chart.length / 10), s1, 3.02));

  const rawName = typeof doc.name === 'string' ? doc.name.trim().slice(0, THEME_NAME_MAX) : '';
  const name = rawName || 'Imported theme';
  const draft: OrbitTheme = {
    id: slug(name),
    name,
    mode,
    category: 'custom',
    colors,
    chart: chart as unknown as ThemeChart,
    syntax,
    fx: { from: colors.accent, to: opaque(purple, s1), glow: colors.accent },
  };

  const { theme, adjusted } = fixTheme(draft);
  const fixes = adjusted.map((token) => ({ token, from: tokenValue(draft, token)!, to: tokenValue(theme, token)! }));
  return { ok: true, theme: adjusted.length ? { ...theme, adjusted } : theme, fixes };
}
