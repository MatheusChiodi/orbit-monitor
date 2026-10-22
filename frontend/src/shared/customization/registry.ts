import { APPEARANCE_SETTINGS } from './definitions/appearance';
import { CARD_SETTINGS } from './definitions/cards';
import type { Category, ComponentType, Scope, SettingDefinition, SettingValue, SettingValues } from './types';
import { validateSettingValue } from './validate';

export { defineSetting, isSettingId } from './define';
export { validateSettingValue } from './validate';

/** CORE-21: the single list of customizable settings (docs/07 §2). */
export const SETTINGS: readonly SettingDefinition[] = [...APPEARANCE_SETTINGS, ...CARD_SETTINGS];

const BY_ID: ReadonlyMap<string, SettingDefinition> = new Map(SETTINGS.map((s) => [s.id, s]));

export function getSetting(id: string): SettingDefinition | undefined {
  return BY_ID.get(id);
}

export function settingsForTarget(target: ComponentType): SettingDefinition[] {
  return SETTINGS.filter((s) => s.target === target);
}

export function settingsInCategory(category: Category): SettingDefinition[] {
  return SETTINGS.filter((s) => s.category === category);
}

/** Validated value for a scope, or `undefined` when the scope may not hold it or the value is invalid. */
export function valueForScope(id: string, scope: Scope, value: unknown): SettingValue | undefined {
  const def = BY_ID.get(id);
  if (!def || !def.scopes.includes(scope)) return undefined;
  return validateSettingValue(def, value);
}

/** Keeps only registered ids with valid values for the scope; everything else is dropped. */
export function sanitizeSettings(input: unknown, scope: Scope): SettingValues {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};
  const out: Record<string, SettingValue> = {};
  for (const [id, raw] of Object.entries(input as Record<string, unknown>)) {
    const value = valueForScope(id, scope, raw);
    if (value !== undefined) out[id] = value;
  }
  return out;
}
