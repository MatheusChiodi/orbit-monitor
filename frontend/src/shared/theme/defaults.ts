import type { ThemeMode } from './types';

/** Built-in theme ids and defaults, kept apart from the theme data so the wall can load themes lazily. */
export const DEFAULT_THEME_ID = 'orbit-dark';

/** Gallery order: default, the 30 editor-inspired themes in spec order, then accessibility themes. */
export const BUILT_IN_THEME_IDS = [
  'orbit-dark',
  'dracula',
  'one-dark',
  'nord',
  'tokyo-night',
  'tokyo-night-storm',
  'catppuccin-mocha',
  'catppuccin-macchiato',
  'catppuccin-frappe',
  'rose-pine',
  'rose-pine-moon',
  'gruvbox-dark',
  'solarized-dark',
  'monokai-classic',
  'github-dark',
  'github-dark-dimmed',
  'ayu-dark',
  'ayu-mirage',
  'night-owl',
  'palenight',
  'everforest-dark',
  'kanagawa',
  'synthwave-84',
  'cobalt2',
  'shades-of-purple',
  'poimandres',
  'github-light',
  'solarized-light',
  'catppuccin-latte',
  'rose-pine-dawn',
  'gruvbox-light',
  'high-contrast-dark',
  'high-contrast-light',
  'oled-black',
  'colorblind-deuteranopia',
  'colorblind-protanopia',
  'colorblind-tritanopia',
] as const;
export type BuiltInThemeId = (typeof BUILT_IN_THEME_IDS)[number];

/** Light/dark pair used when the device follows `prefers-color-scheme`. */
export const DEFAULT_SCHEME_PAIR: Readonly<Record<ThemeMode, string>> = { dark: 'orbit-dark', light: 'github-light' };

const BUILT_IN_ID_SET: ReadonlySet<string> = new Set(BUILT_IN_THEME_IDS);

/** True for the id of a built-in theme, without loading any theme data (lean wall bundle). */
export function isBuiltInThemeId(id: string): boolean {
  return BUILT_IN_ID_SET.has(id);
}
