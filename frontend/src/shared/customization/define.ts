import type { SettingDefinition } from './types';
import { validateSettingValue } from './validate';

export const SETTING_ID_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9-]+)+$/;

export function isSettingId(value: unknown): value is string {
  return typeof value === 'string' && SETTING_ID_PATTERN.test(value);
}

/** Declares a setting; a malformed id, no scope or a default outside the schema fails at load time. */
export function defineSetting<const T extends SettingDefinition>(def: T): T {
  if (!isSettingId(def.id)) throw new Error(`Invalid setting id: ${def.id}`);
  if (def.scopes.length === 0) throw new Error(`Setting ${def.id} needs at least one scope`);
  const normalized = validateSettingValue(def, def.default);
  if (normalized === undefined || JSON.stringify(normalized) !== JSON.stringify(def.default)) {
    throw new Error(`Setting ${def.id} has a default outside its schema`);
  }
  return Object.freeze(def);
}
