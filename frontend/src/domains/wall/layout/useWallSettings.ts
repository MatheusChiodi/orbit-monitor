import { useEffect, useState } from 'react';
import type { WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import type { OrbitTheme } from '@/shared/theme/types';

export type LoadWorkspaceDefaults = () => Promise<WorkspacePreferenceDefaults>;
/** Raw `orbit.themes.json` items; validated here before use. */
export type LoadCustomThemes = () => Promise<readonly unknown[]>;

export interface WallSettings {
  defaults: WorkspacePreferenceDefaults;
  customThemes: readonly OrbitTheme[];
}

const NONE: WallSettings = { defaults: {}, customThemes: [] };

/** BE-40 workspace defaults and custom themes for the wall; failures keep the built-in defaults. */
export function useWallSettings(loadDefaults?: LoadWorkspaceDefaults, loadThemes?: LoadCustomThemes): WallSettings {
  const [settings, setSettings] = useState<WallSettings>(NONE);
  useEffect(() => {
    let current = true;
    loadDefaults?.()
      .then((defaults) => current && setSettings((s) => ({ ...s, defaults })))
      .catch(() => {});
    loadThemes?.()
      // Validation (schema, contrast) loads only when there are custom themes to check.
      .then(async (items) => (items.length === 0 ? [] : (await import('@/shared/theme/customThemeItems')).sanitizeCustomThemes(items)))
      .then((customThemes) => current && setSettings((s) => ({ ...s, customThemes })))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [loadDefaults, loadThemes]);
  return settings;
}
