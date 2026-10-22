import { createStore } from 'zustand/vanilla';
import { normalizeOperatorName } from '@/domains/security/operator/operator';
import { isLocale, type Locale } from '@/shared/i18n/i18n';
import type { Message } from '@/shared/i18n/message';
import { DEFAULT_ANIMATION_LEVEL, isAnimationLevel, type AnimationLevel } from '@/shared/motion/animationLevel';
import { THEME_ID_PATTERN } from '@/shared/theme/types';
import { DEFAULT_DENSITY, isDensity, type Density } from './density';
import { DEFAULT_VIEWING_DISTANCE, isViewingDistance, type ViewingDistance } from './viewingDistance';

/**
 * FE-50: preferences of this device. Only the fields the person changed are stored (`localStorage`);
 * everything else comes from the workspace defaults (`orbit.settings.json`) and then the built-in defaults.
 * Never holds probe data, secrets or config (docs/04-data-protection.md).
 */
export interface Preferences {
  theme: string;
  animation: AnimationLevel;
  density: Density;
  locale: Locale;
  scale: ViewingDistance;
  operatorName: string | null;
}

export type PreferenceKey = keyof Preferences;
export type DeviceChoices = Partial<Preferences>;
/** Workspace defaults from the API; the operator name is always per device. */
export type WorkspacePreferenceDefaults = Partial<Omit<Preferences, 'operatorName'>>;

export const PREFERENCES_KEY = 'orbit.preferences';
export const PREFERENCES_FILE_VERSION = 1;

export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
  theme: 'orbit-dark',
  animation: DEFAULT_ANIMATION_LEVEL,
  density: DEFAULT_DENSITY,
  locale: 'en',
  scale: DEFAULT_VIEWING_DISTANCE,
  operatorName: null,
});

const VALIDATORS: { [K in PreferenceKey]: (value: unknown) => Preferences[K] | undefined } = {
  theme: (v) => (typeof v === 'string' && THEME_ID_PATTERN.test(v) ? v : undefined),
  animation: (v) => (isAnimationLevel(v) ? v : undefined),
  density: (v) => (isDensity(v) ? v : undefined),
  locale: (v) => (isLocale(v) ? v : undefined),
  scale: (v) => (isViewingDistance(v) ? v : undefined),
  operatorName: (v) => (typeof v === 'string' ? (normalizeOperatorName(v) ?? undefined) : undefined),
};

const KEYS = Object.keys(VALIDATORS) as PreferenceKey[];

/** Keeps only the known keys with valid values; anything else (secrets, rows, config) is dropped. */
export function sanitizePreferences(input: unknown): DeviceChoices {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of KEYS) {
    const value = VALIDATORS[key](source[key]);
    if (value !== undefined) out[key] = value;
  }
  return out as DeviceChoices;
}

/** Device choices win over workspace defaults, which win over the built-in defaults. */
export function mergeWithWorkspaceDefaults(device: DeviceChoices, defaults: WorkspacePreferenceDefaults = {}): Preferences {
  const workspace = sanitizePreferences(defaults);
  delete workspace.operatorName;
  return { ...DEFAULT_PREFERENCES, ...workspace, ...sanitizePreferences(device) };
}

export function loadPreferences(): DeviceChoices {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return raw ? sanitizePreferences(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function savePreferences(device: DeviceChoices): void {
  try {
    const clean = sanitizePreferences(device);
    if (Object.keys(clean).length === 0) localStorage.removeItem(PREFERENCES_KEY);
    else localStorage.setItem(PREFERENCES_KEY, JSON.stringify(clean));
  } catch {
    // storage blocked: the choices last only for this page
  }
}

export function exportPreferences(device: DeviceChoices): string {
  return JSON.stringify({ version: PREFERENCES_FILE_VERSION, preferences: sanitizePreferences(device) }, null, 2);
}

export type ParsePreferencesResult = { ok: true; preferences: DeviceChoices } | { ok: false; error: Message };

export function parsePreferencesFile(text: string): ParsePreferencesResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, error: { key: 'preferences.file.invalidJson' } };
  }
  if (typeof doc !== 'object' || doc === null) return { ok: false, error: { key: 'preferences.file.invalidJson' } };
  const { version, preferences } = doc as { version?: unknown; preferences?: unknown };
  if (version !== PREFERENCES_FILE_VERSION) {
    const shown = typeof version === 'number' || typeof version === 'string' ? version : '?';
    return { ok: false, error: { key: 'preferences.file.unsupportedVersion', params: { version: shown } } };
  }
  return { ok: true, preferences: sanitizePreferences(preferences) };
}

export interface PreferencesState {
  device: DeviceChoices;
  defaults: WorkspacePreferenceDefaults;
  effective: Preferences;
  set: <K extends PreferenceKey>(key: K, value: Preferences[K]) => void;
  /** Replaces every device choice (JSON import). */
  replace: (device: DeviceChoices) => void;
  /** Clears the device choices: the workspace defaults apply again. */
  reset: () => void;
  setWorkspaceDefaults: (defaults: WorkspacePreferenceDefaults) => void;
}

export function createPreferencesStore(defaults: WorkspacePreferenceDefaults = {}) {
  const initial = loadPreferences();
  return createStore<PreferencesState>()((setState, get) => {
    const commit = (device: DeviceChoices) => {
      const clean = sanitizePreferences(device);
      savePreferences(clean);
      setState({ device: clean, effective: mergeWithWorkspaceDefaults(clean, get().defaults) });
    };
    return {
      device: initial,
      defaults,
      effective: mergeWithWorkspaceDefaults(initial, defaults),
      set: (key, value) => commit({ ...get().device, [key]: value }),
      replace: (device) => commit(device),
      reset: () => commit({}),
      setWorkspaceDefaults: (next) => setState({ defaults: next, effective: mergeWithWorkspaceDefaults(get().device, next) }),
    };
  });
}

export type PreferencesStore = ReturnType<typeof createPreferencesStore>;
