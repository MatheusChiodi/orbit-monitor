import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useAnimationLevel } from '@/shared/motion';
import { applyTheme } from './applyTheme';
import { loadDevicePrefs, saveDevicePrefs, type DeviceThemePrefs } from './deviceStore';
import { BUILT_IN_THEMES, builtInTheme } from './registry';
import { findTheme, resolveThemeId, themeFromUrl, type ThemeSource } from './scope';
import type { OrbitTheme, ThemeMode } from './types';
import './transition.css';

export interface ThemeContextValue {
  theme: OrbitTheme;
  source: ThemeSource;
  /** Built-in themes followed by custom ones. */
  themes: readonly OrbitTheme[];
  deviceThemeId: string | null;
  /** null clears the device choice ("Restore default"). */
  setDeviceTheme: (id: string | null) => void;
  /** Hover preview on the real screen; null restores the applied theme. */
  preview: (id: string | null) => void;
  previewing: string | null;
  favorites: readonly string[];
  toggleFavorite: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';
function subscribeScheme(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const prefersDark = () => (typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY).matches : true);

export interface ThemeProviderProps {
  customThemes?: readonly OrbitTheme[];
  /** Workspace default from `orbit.settings.json`. */
  workspaceThemeId?: string | null;
  /** Wall layout override from `orbit.layouts.json` (FE-05). */
  layoutThemeId?: string | null;
  schemePair?: Readonly<Record<ThemeMode, string>>;
  /** Element that receives the CSS variables; defaults to `<html>`. */
  target?: HTMLElement;
  /** Defaults to `window.location.search` (`?theme=`). */
  search?: string;
  children: ReactNode;
}

const NO_CUSTOM: readonly OrbitTheme[] = [];

export function ThemeProvider({
  customThemes = NO_CUSTOM,
  workspaceThemeId = null,
  layoutThemeId = null,
  schemePair,
  target,
  search,
  children,
}: ThemeProviderProps) {
  const [prefs, setPrefs] = useState<DeviceThemePrefs>(loadDevicePrefs);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const dark = useSyncExternalStore(subscribeScheme, prefersDark, () => true);
  const level = useAnimationLevel();

  const exists = useCallback((id: string) => Boolean(builtInTheme(id) ?? customThemes.find((t) => t.id === id)), [customThemes]);
  const resolved = resolveThemeId(
    {
      url: themeFromUrl(search ?? window.location.search),
      layout: layoutThemeId,
      device: prefs.themeId,
      workspace: workspaceThemeId,
      prefersDark: dark,
      ...(schemePair ? { schemePair } : {}),
    },
    { exists },
  );
  const theme = findTheme(previewing && exists(previewing) ? previewing : resolved.id, customThemes);

  useLayoutEffect(() => {
    applyTheme(theme, target ?? document.documentElement, { animate: level !== 'off' });
  }, [theme, target, level]);

  const update = useCallback((change: (p: DeviceThemePrefs) => DeviceThemePrefs) => {
    setPrefs((current) => {
      const next = change(current);
      saveDevicePrefs(next);
      return next;
    });
  }, []);

  const setDeviceTheme = useCallback((id: string | null) => update((p) => ({ ...p, themeId: id })), [update]);
  const toggleFavorite = useCallback(
    (id: string) =>
      update((p) => ({
        ...p,
        favorites: p.favorites.includes(id) ? p.favorites.filter((f) => f !== id) : [...p.favorites, id],
      })),
    [update],
  );

  const themes = useMemo(() => [...BUILT_IN_THEMES, ...customThemes], [customThemes]);
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      source: resolved.source,
      themes,
      deviceThemeId: prefs.themeId,
      setDeviceTheme,
      preview: setPreviewing,
      previewing,
      favorites: prefs.favorites,
      toggleFavorite,
    }),
    [theme, resolved.source, themes, prefs, setDeviceTheme, previewing, toggleFavorite],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
