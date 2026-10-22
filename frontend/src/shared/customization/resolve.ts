import { getSetting, valueForScope } from './registry';
import type { Scope, SettingValue, SettingValues, ValueSource } from './types';
import { validateSettingValue } from './validate';

export interface CustomizationLayers {
  workspace: SettingValues;
  layouts: Readonly<Record<string, SettingValues>>;
  instances: Readonly<Record<string, SettingValues>>;
  device: SettingValues;
  /** Customize mode: unsaved changes previewed live above every scope (FE-53). */
  draft?: SettingValues;
  /** Device values that live in the FE-50 preferences (density, animation). */
  bridgedDevice?: SettingValues;
  /** Workspace defaults of bridged settings from `orbit.settings.json`. */
  bridgedDefaults?: SettingValues;
}

export const EMPTY_LAYERS: CustomizationLayers = Object.freeze({ workspace: {}, layouts: {}, instances: {}, device: {} });

export interface ResolveContext {
  instanceId?: string | null;
  layoutId?: string | null;
}

export interface ResolvedSetting {
  value: SettingValue;
  source: ValueSource;
}

/** docs/07 §3: draft > instance > layout > device > workspace > default. */
export function resolveSetting(id: string, layers: CustomizationLayers, context: ResolveContext = {}): ResolvedSetting {
  const def = getSetting(id);
  if (!def) throw new Error(`Unknown setting: ${id}`);
  if (layers.draft && id in layers.draft) {
    const value = validateSettingValue(def, layers.draft[id]);
    if (value !== undefined) return { value, source: 'draft' };
  }
  const { instanceId, layoutId } = context;
  const candidates: [Scope, SettingValues | undefined][] = [
    ['instance', instanceId ? layers.instances[instanceId] : undefined],
    ['layout', layoutId ? layers.layouts[layoutId] : undefined],
    ['device', { ...layers.bridgedDevice, ...layers.device }],
    ['workspace', layers.workspace],
  ];
  for (const [source, values] of candidates) {
    if (!values || !(id in values)) continue;
    const value = valueForScope(id, source, values[id]);
    if (value !== undefined) return { value, source };
  }
  const bridged = layers.bridgedDefaults?.[id];
  const fallback = bridged === undefined ? undefined : validateSettingValue(def, bridged);
  return { value: fallback ?? def.default, source: 'default' };
}
