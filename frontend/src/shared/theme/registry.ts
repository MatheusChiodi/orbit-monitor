import type { OrbitTheme, ThemeMode } from './types';

/** Built-in themes, one JSON per theme in `./themes` (docs/05-extended-features.md §1.3). */
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

const modules = import.meta.glob<OrbitTheme>('./themes/*.json', { eager: true, import: 'default' });
const byId = new Map<string, OrbitTheme>(
  Object.values(modules).map((theme) => [theme.id, Object.freeze(theme) as OrbitTheme]),
);

export const BUILT_IN_THEMES: readonly OrbitTheme[] = BUILT_IN_THEME_IDS.flatMap((id) => {
  const theme = byId.get(id);
  return theme ? [theme] : [];
});

export const ORBIT_DARK: OrbitTheme = byId.get(DEFAULT_THEME_ID)!;

export function builtInTheme(id: string): OrbitTheme | undefined {
  return byId.get(id);
}

export function isBuiltInThemeId(id: string): boolean {
  return byId.has(id);
}

/** Light/dark pair used when the device follows `prefers-color-scheme`. */
export const DEFAULT_SCHEME_PAIR: Readonly<Record<ThemeMode, string>> = { dark: 'orbit-dark', light: 'github-light' };
