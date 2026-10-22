import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { isBuiltInThemeId } from './defaults';
import { loadBuiltInTheme } from './lazyThemes';
import { resolveThemeId, themeFromUrl, type ThemeSource } from './resolveTheme';
import type { OrbitTheme, ThemeMode } from './types';
import './transition.css';

export interface AppliedTheme {
  id: string;
  source: ThemeSource;
}

const AppliedThemeContext = createContext<AppliedTheme>({ id: 'orbit-dark', source: 'default' });

const DARK_QUERY = '(prefers-color-scheme: dark)';
function subscribeScheme(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener?.('change', onChange);
  return () => query.removeEventListener?.('change', onChange);
}
const prefersDark = () => (typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY).matches : true);

export interface LazyThemeProviderProps {
  /** Custom themes from `orbit.themes.json`. */
  customThemes?: readonly OrbitTheme[];
  workspaceThemeId?: string | null;
  /** FE-50 device choice (`orbit.preferences`). */
  deviceThemeId?: string | null;
  /** FE-05 wall layout override. */
  layoutThemeId?: string | null;
  schemePair?: Readonly<Record<ThemeMode, string>>;
  /** Cross-fade colors (false when the animation level is `off`). */
  animate?: boolean;
  /** Defaults to `<html>`. */
  target?: HTMLElement;
  /** Defaults to `window.location.search` (`?theme=`). */
  search?: string;
  children: ReactNode;
}

const NO_CUSTOM: readonly OrbitTheme[] = [];

/**
 * FE-03/FE-05 for the wall: same precedence as `ThemeProvider` (`?theme=` → layout → device → workspace
 * → Orbit Dark, `system` = light/dark pair) but built-in themes are imported one by one on demand, so
 * the wall never ships the 37 theme files. Until the theme arrives the CSS defaults (Orbit Dark) apply.
 */
export function LazyThemeProvider({
  customThemes = NO_CUSTOM,
  workspaceThemeId = null,
  deviceThemeId = null,
  layoutThemeId = null,
  schemePair,
  animate = true,
  target,
  search,
  children,
}: LazyThemeProviderProps) {
  const dark = useSyncExternalStore(subscribeScheme, prefersDark, () => true);
  const exists = (id: string) => isBuiltInThemeId(id) || customThemes.some((t) => t.id === id);
  const resolved = resolveThemeId(
    {
      url: themeFromUrl(search ?? window.location.search),
      layout: layoutThemeId,
      device: deviceThemeId,
      workspace: workspaceThemeId,
      prefersDark: dark,
      ...(schemePair ? { schemePair } : {}),
    },
    { exists },
  );
  const custom = customThemes.find((t) => t.id === resolved.id) ?? null;

  useEffect(() => {
    const element = target ?? document.documentElement;
    let current = true;
    // The color math (contrast, derived tokens) loads with the theme, after first paint.
    const theme = custom && !isBuiltInThemeId(custom.id) ? Promise.resolve(custom) : loadBuiltInTheme(resolved.id);
    void Promise.all([theme, import('./applyTheme')]).then(([loaded, { applyTheme }]) => {
      if (current && loaded) applyTheme(loaded, element, { animate });
    });
    return () => {
      current = false;
    };
  }, [resolved.id, custom, target, animate]);

  const value = useMemo(() => ({ id: resolved.id, source: resolved.source }), [resolved.id, resolved.source]);
  return <AppliedThemeContext.Provider value={value}>{children}</AppliedThemeContext.Provider>;
}

export function useAppliedTheme(): AppliedTheme {
  return useContext(AppliedThemeContext);
}
