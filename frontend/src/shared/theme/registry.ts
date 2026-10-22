import { DEFAULT_THEME_ID, BUILT_IN_THEME_IDS } from './defaults';
import type { OrbitTheme } from './types';

export { BUILT_IN_THEME_IDS, DEFAULT_SCHEME_PAIR, DEFAULT_THEME_ID, isBuiltInThemeId, type BuiltInThemeId } from './defaults';

/** Built-in themes, one JSON per theme in `./themes` (docs/05-extended-features.md §1.3), loaded eagerly. */
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

/** Built-in theme by id, then a custom one, then Orbit Dark. */
export function findTheme(id: string, custom: readonly OrbitTheme[] = []): OrbitTheme {
  return builtInTheme(id) ?? custom.find((t) => t.id === id) ?? ORBIT_DARK;
}
