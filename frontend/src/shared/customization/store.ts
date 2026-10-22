import { createStore } from 'zustand/vanilla';
import type { Message } from '@/shared/i18n/message';
import type { DeviceChoices, Preferences, PreferencesStore } from '@/shared/preferences/preferences';
import { entryId, errorMessage, type CustomizationApi, type CustomizationProfile } from './api';
import { applyChanges, type PendingChange } from './changes';
import { PREFERENCE_BRIDGES } from './definitions/appearance';
import { SETTINGS, getSetting, sanitizeSettings, valueForScope } from './registry';
import { resolveSetting, type CustomizationLayers, type ResolveContext, type ResolvedSetting } from './resolve';
import type { Category, Scope, ServerScope, SettingValue, SettingValues } from './types';
import { sameValue } from './validate';

/** Device scope (docs/07 §6): browser storage on this device, workspace values as fallback. */
export const DEVICE_CUSTOMIZATION_KEY = 'orbit.customization.device';

type BridgedId = keyof typeof PREFERENCE_BRIDGES;

function isBridged(id: string): id is BridgedId {
  return id in PREFERENCE_BRIDGES;
}

function loadDevice(): SettingValues {
  try {
    const raw = localStorage.getItem(DEVICE_CUSTOMIZATION_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw), 'device') : {};
  } catch {
    return {};
  }
}

function saveDevice(values: SettingValues): void {
  try {
    if (Object.keys(values).length === 0) localStorage.removeItem(DEVICE_CUSTOMIZATION_KEY);
    else localStorage.setItem(DEVICE_CUSTOMIZATION_KEY, JSON.stringify(values));
  } catch {
    // storage blocked: the values last only for this page
  }
}

function bridgedFrom(prefs: Partial<Preferences>): SettingValues {
  const out: Record<string, SettingValue> = {};
  for (const [id, key] of Object.entries(PREFERENCE_BRIDGES)) {
    const value = prefs[key];
    if (typeof value === 'string') out[id] = value;
  }
  return out;
}


export interface CustomizationOptions {
  api?: CustomizationApi;
  /** FE-50 store: device density and animation level stay there. */
  preferences?: PreferencesStore;
  /** `false` keeps device values in memory only (fallback store, tests). */
  storage?: boolean;
}

export interface CustomizationState extends Required<Omit<CustomizationLayers, 'draft'>> {
  /** FE-53: unsaved Customize-mode changes, previewed live by `resolve`. */
  pending: readonly PendingChange[];
  profiles: CustomizationProfile[];
  /** Wall layouts known to the workspace (layout scope targets). */
  layoutIds: string[];
  loaded: boolean;
  error: Message | null;
  load: () => Promise<void>;
  resolve: (id: string, context?: ResolveContext) => ResolvedSetting;
  /** Values stored at one scope (`target` = layout or instance id). */
  valuesAt: (scope: Scope, target?: string | null) => SettingValues;
  setValue: (scope: Scope, id: string, value: unknown, target?: string | null) => Promise<void>;
  resetValue: (scope: Scope, id: string, target?: string | null) => Promise<void>;
  resetCategory: (scope: Scope, category: Category, target?: string | null) => Promise<void>;
  resetScope: (scope: Scope, target?: string | null) => Promise<void>;
  /** Replaces every value of a scope (JSON view, profiles); unknown or invalid keys are dropped. */
  replaceScope: (scope: Scope, values: unknown, target?: string | null) => Promise<void>;
  /** Ids whose value at this scope differs from the product default. */
  modified: (scope: Scope, target?: string | null) => string[];
  setPending: (changes: readonly PendingChange[]) => void;
  /** Writes the pending changes to every scope they touch (Customize mode Save). */
  commitPending: () => Promise<void>;
  setProfiles: (profiles: CustomizationProfile[]) => void;
  /** FE-57 custom profiles, stored in `orbit.customization.json`. */
  saveProfile: (profile: CustomizationProfile) => Promise<boolean>;
  deleteProfile: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function createCustomizationStore(options: CustomizationOptions = {}) {
  const { api, preferences, storage = true } = options;
  const store = createStore<CustomizationState>()((set, get) => {
    const layers = (): CustomizationLayers => {
      const s = get();
      return { workspace: s.workspace, layouts: s.layouts, instances: s.instances, device: s.device, bridgedDevice: s.bridgedDevice, bridgedDefaults: s.bridgedDefaults };
    };

    const valuesAt = (scope: Scope, target?: string | null): SettingValues => {
      const s = get();
      if (scope === 'workspace') return s.workspace;
      if (scope === 'device') return { ...s.bridgedDevice, ...s.device };
      if (!target) return {};
      return (scope === 'layout' ? s.layouts : s.instances)[target] ?? {};
    };

    const writeDevice = (values: SettingValues) => {
      const own: Record<string, SettingValue> = {};
      const bridged: DeviceChoices = {};
      for (const [id, value] of Object.entries(values)) {
        if (isBridged(id)) Object.assign(bridged, { [PREFERENCE_BRIDGES[id]]: value });
        else own[id] = value;
      }
      if (storage) saveDevice(own);
      set({ device: own });
      if (preferences) {
        const current = { ...preferences.getState().device };
        for (const key of Object.values(PREFERENCE_BRIDGES)) delete current[key];
        preferences.getState().replace({ ...current, ...bridged });
      }
    };

    const writeServer = async (scope: ServerScope, values: SettingValues, target?: string | null) => {
      const before = { workspace: get().workspace, layouts: get().layouts, instances: get().instances };
      if (scope === 'workspace') set({ workspace: values });
      else if (target) {
        const key = scope === 'layout' ? 'layouts' : 'instances';
        const next = { ...get()[key] };
        if (Object.keys(values).length === 0) delete next[target];
        else next[target] = values;
        set({ [key]: next } as Pick<CustomizationState, typeof key>);
      } else return;
      if (!api) return;
      try {
        if (Object.keys(values).length === 0) await api.deleteEntry(entryId(scope, target));
        else await api.saveScope(scope, target ?? null, values);
        set({ error: null });
      } catch (error) {
        set({ ...before, error: errorMessage(error) });
      }
    };

    const write = async (scope: Scope, values: SettingValues, target?: string | null) => {
      if (scope === 'device') writeDevice(values);
      else await writeServer(scope, values, target);
    };

    const without = (values: SettingValues, drop: (id: string) => boolean): SettingValues =>
      Object.fromEntries(Object.entries(values).filter(([id]) => !drop(id)));

    return {
      workspace: {},
      layouts: {},
      instances: {},
      device: storage ? loadDevice() : {},
      pending: [],
      bridgedDevice: preferences ? bridgedFrom(preferences.getState().device) : {},
      bridgedDefaults: preferences ? bridgedFrom(preferences.getState().effective) : {},
      profiles: [],
      layoutIds: [],
      loaded: !api,
      error: null,
      async load() {
        if (!api) return;
        try {
          const data = await api.load();
          set({ workspace: data.workspace, layouts: data.layouts, instances: data.instances, profiles: data.profiles, loaded: true });
          const layoutIds = await api.listLayoutIds?.().catch(() => []);
          if (layoutIds) set({ layoutIds });
        } catch {
          set({ loaded: true, error: { key: 'customization.errors.loadFailed' } });
        }
      },
      resolve: (id, context) => {
        const pending = get().pending;
        return resolveSetting(id, pending.length > 0 ? applyChanges(layers(), pending) : layers(), context);
      },
      valuesAt,
      async setValue(scope, id, value, target) {
        const valid = valueForScope(id, scope, value);
        if (valid === undefined) return;
        await write(scope, { ...valuesAt(scope, target), [id]: valid }, target);
      },
      async resetValue(scope, id, target) {
        await write(scope, without(valuesAt(scope, target), (key) => key === id), target);
      },
      async resetCategory(scope, category, target) {
        await write(scope, without(valuesAt(scope, target), (key) => getSetting(key)?.category === category), target);
      },
      async resetScope(scope, target) {
        await write(scope, {}, target);
      },
      async replaceScope(scope, values, target) {
        await write(scope, sanitizeSettings(values, scope), target);
      },
      modified(scope, target) {
        const values = valuesAt(scope, target);
        return SETTINGS.filter((s) => s.id in values && !sameValue(values[s.id], s.default)).map((s) => s.id);
      },
      setPending: (changes) => set({ pending: changes }),
      async commitPending() {
        const before = layers();
        const after = applyChanges(before, get().pending);
        set({ pending: [] });
        if (!sameValue(before.device, after.device)) writeDevice({ ...valuesAt('device'), ...after.device });
        if (!sameValue(before.workspace, after.workspace)) await writeServer('workspace', after.workspace);
        for (const key of new Set([...Object.keys(before.layouts), ...Object.keys(after.layouts)])) {
          if (!sameValue(before.layouts[key], after.layouts[key])) await writeServer('layout', after.layouts[key] ?? {}, key);
        }
        for (const key of new Set([...Object.keys(before.instances), ...Object.keys(after.instances)])) {
          if (!sameValue(before.instances[key], after.instances[key])) await writeServer('instance', after.instances[key] ?? {}, key);
        }
      },
      setProfiles: (profiles) => set({ profiles }),
      async saveProfile(profile) {
        try {
          await api?.saveProfile(profile);
          const rest = get().profiles.filter((p) => p.id !== profile.id);
          set({ profiles: [...rest, profile], error: null });
          return true;
        } catch (error) {
          set({ error: errorMessage(error) });
          return false;
        }
      },
      async deleteProfile(id) {
        try {
          await api?.deleteEntry(id);
          set({ profiles: get().profiles.filter((p) => p.id !== id), error: null });
          return true;
        } catch (error) {
          set({ error: errorMessage(error) });
          return false;
        }
      },
      clearError: () => set({ error: null }),
    };
  });

  preferences?.subscribe((prefs) => {
    store.setState({ bridgedDevice: bridgedFrom(prefs.device), bridgedDefaults: bridgedFrom(prefs.effective) });
  });
  return store;
}

export type CustomizationStore = ReturnType<typeof createCustomizationStore>;
