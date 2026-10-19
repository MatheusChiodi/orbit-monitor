import { THEME_ID_PATTERN } from './types';

/** Per-device theme choice and favorites (FE-50: device preferences stay in the browser). */
export const DEVICE_THEME_KEY = 'orbit.theme';
const VERSION = 1;
const MAX_FAVORITES = 100;

export interface DeviceThemePrefs {
  /** Theme id, `system`, or null to use the workspace default. */
  themeId: string | null;
  favorites: string[];
}

const EMPTY: DeviceThemePrefs = { themeId: null, favorites: [] };
const validId = (v: unknown): v is string => typeof v === 'string' && THEME_ID_PATTERN.test(v);

export function loadDevicePrefs(): DeviceThemePrefs {
  try {
    const raw = localStorage.getItem(DEVICE_THEME_KEY);
    if (!raw) return EMPTY;
    const doc: unknown = JSON.parse(raw);
    if (typeof doc !== 'object' || doc === null || (doc as { version?: unknown }).version !== VERSION) return EMPTY;
    const { themeId, favorites } = doc as { themeId?: unknown; favorites?: unknown };
    return {
      themeId: validId(themeId) ? themeId : null,
      favorites: Array.isArray(favorites) ? [...new Set(favorites.filter(validId))].slice(0, MAX_FAVORITES) : [],
    };
  } catch {
    return EMPTY;
  }
}

export function saveDevicePrefs(prefs: DeviceThemePrefs): void {
  try {
    localStorage.setItem(DEVICE_THEME_KEY, JSON.stringify({ version: VERSION, ...prefs }));
  } catch {
    // storage blocked: the choice lasts only for this page
  }
}
