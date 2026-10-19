/** Theme tokens (docs/05-extended-features.md §1.3, docs/03-design.md §2). */
export const COLOR_TOKENS = [
  'bg',
  's1',
  's2',
  's3',
  'line',
  'line2',
  'text',
  'muted',
  'dim',
  'ok',
  'warn',
  'down',
  'info',
  'accent',
] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];
export type ThemeColors = Record<ColorToken, string>;

export const STATUS_TOKENS = ['ok', 'warn', 'down', 'info'] as const satisfies readonly ColorToken[];
export type StatusToken = (typeof STATUS_TOKENS)[number];

export const SYNTAX_TOKENS = ['keyword', 'string', 'number', 'comment', 'function', 'operator', 'identifier'] as const;
export type SyntaxToken = (typeof SYNTAX_TOKENS)[number];
export type ThemeSyntax = Record<SyntaxToken, string>;

export const FX_TOKENS = ['from', 'to', 'glow'] as const;
export type FxToken = (typeof FX_TOKENS)[number];
export type ThemeFx = Record<FxToken, string>;

export const CHART_SIZE = 6;
export type ThemeChart = readonly [string, string, string, string, string, string];

export const THEME_MODES = ['dark', 'light'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Gallery filter group: the default theme, an editor-inspired one or an accessibility theme. */
export const THEME_CATEGORIES = ['default', 'editor', 'accessible', 'custom'] as const;
export type ThemeCategory = (typeof THEME_CATEGORIES)[number];

/** Which deficiency an accessibility theme is tuned for: its status colors must stay far apart under it. */
export type CvdTarget = 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface OrbitTheme {
  id: string;
  name: string;
  mode: ThemeMode;
  category: ThemeCategory;
  colors: ThemeColors;
  chart: ThemeChart;
  syntax: ThemeSyntax;
  fx: ThemeFx;
  /** Built-in themes: credits of the palette they reproduce. */
  inspiredBy?: string;
  author?: string;
  license?: string;
  url?: string;
  /** Tokens whose upstream value was changed to pass the contrast guard (FE-02). */
  adjusted?: string[];
  cvdTarget?: CvdTarget;
  /** Custom themes: id of the theme it was duplicated from. */
  basedOn?: string;
}

export const THEME_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
export const THEME_NAME_MAX = 60;
