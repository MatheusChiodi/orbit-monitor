import type { ObjectValue, SettingDefinition, SettingValue } from './types';

/** Theme color tokens a color setting may reference (docs/03 §2). */
export const COLOR_TOKENS = ['text', 'muted', 'dim', 'ok', 'warn', 'down', 'info', 's1', 's2', 's3', 'line'] as const;
const HEX = /^#[0-9a-f]{6}$/i;
const CONTROL = /[\u0000-\u001f\u007f]/g;

export function cleanText(value: string): string {
  return value.replace(CONTROL, '').trim();
}

function validateObject(fields: Readonly<Record<string, string>>, value: unknown): ObjectValue | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, kind] of Object.entries(fields)) {
    const item = (value as Record<string, unknown>)[key];
    if (kind === 'string' && typeof item === 'string') out[key] = cleanText(item).slice(0, 200);
    else if (kind === 'number' && typeof item === 'number' && Number.isFinite(item)) out[key] = item;
    else if (kind === 'boolean' && typeof item === 'boolean') out[key] = item;
  }
  return out;
}

/** Returns the normalized value, or `undefined` when it does not fit the schema. */
export function validateSettingValue(def: SettingDefinition, value: unknown): SettingValue | undefined {
  switch (def.type) {
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined;
    case 'enum':
    case 'action':
    case 'font':
      return typeof value === 'string' && def.values.includes(value) ? value : undefined;
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
      const clamped = Math.min(def.max, Math.max(def.min, value));
      const snapped = def.min + Math.round((clamped - def.min) / def.step) * def.step;
      return Number(Math.min(def.max, snapped).toFixed(4));
    }
    case 'color': {
      if (typeof value !== 'string') return undefined;
      if ((COLOR_TOKENS as readonly string[]).includes(value)) return value;
      return HEX.test(value) ? value.toLowerCase() : undefined;
    }
    case 'text': {
      if (typeof value !== 'string') return undefined;
      const text = cleanText(value);
      return text.length <= def.maxLength ? text : undefined;
    }
    case 'list': {
      if (!Array.isArray(value)) return undefined;
      const known = value.filter((v): v is string => typeof v === 'string' && def.values.includes(v));
      const required = (def.required ?? []).filter((r) => !known.includes(r));
      return [...new Set([...required, ...known])];
    }
    case 'object':
      return validateObject(def.fields, value);
  }
}

export function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
