import { DEFAULT_SCHEME_PAIR, DEFAULT_THEME_ID, ORBIT_DARK, builtInTheme } from './registry';
import { THEME_ID_PATTERN, type OrbitTheme, type ThemeMode } from './types';

/**
 * FE-05 scope (docs/05 §1.3), highest first: `?theme=` → wall layout override (`orbit.layouts.json`)
 * → device setting (FE-50) → workspace default (`orbit.settings.json`) → Orbit Dark.
 */
export const SYSTEM_THEME = 'system';

export type ThemeSource = 'url' | 'layout' | 'device' | 'workspace' | 'default';

export interface ThemeScopes {
  url?: string | null;
  layout?: string | null;
  device?: string | null;
  workspace?: string | null;
  /** `prefers-color-scheme: dark`, used when a level is set to `system`. */
  prefersDark?: boolean;
  schemePair?: Readonly<Record<ThemeMode, string>>;
}

export interface ResolveOptions {
  exists?: (id: string) => boolean;
}

export function resolveThemeId(scopes: ThemeScopes, options: ResolveOptions = {}): { id: string; source: ThemeSource } {
  const exists = options.exists ?? (() => true);
  const pair = scopes.schemePair ?? DEFAULT_SCHEME_PAIR;
  const levels: readonly [ThemeSource, string | null | undefined][] = [
    ['url', scopes.url],
    ['layout', scopes.layout],
    ['device', scopes.device],
    ['workspace', scopes.workspace],
  ];
  for (const [source, value] of levels) {
    if (!value) continue;
    const id = value === SYSTEM_THEME ? pair[scopes.prefersDark === false ? 'light' : 'dark'] : value;
    if (exists(id)) return { id, source };
  }
  return { id: DEFAULT_THEME_ID, source: 'default' };
}

export function themeFromUrl(search: string): string | null {
  const value = new URLSearchParams(search).get('theme');
  return value && THEME_ID_PATTERN.test(value) ? value : null;
}

export function findTheme(id: string, custom: readonly OrbitTheme[] = []): OrbitTheme {
  return builtInTheme(id) ?? custom.find((t) => t.id === id) ?? ORBIT_DARK;
}
