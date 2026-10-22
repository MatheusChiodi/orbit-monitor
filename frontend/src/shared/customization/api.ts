import { ApiError, createApiClient, type ApiClientOptions } from '@/shared/api/client';
import { SUPPORTED_LOCALES, isLocale, type Locale } from '@/shared/i18n/i18n';
import type { Message } from '@/shared/i18n/message';
import { sanitizeSettings } from './registry';
import { COMPONENT_TYPES, type ServerScope, type SettingValues } from './types';
import { cleanText } from './validate';

/**
 * BE-51 contract (backend/orbit-api `CustomizationController`, `TerminologyController`):
 * `orbit.customization.json` items `{ id, scope: workspace|layout|instance|profile, target, name, values }`;
 * `orbit.terminology.json` items `{ id: <locale>, terms }`. The device scope never leaves the browser.
 */
export interface CustomizationProfile {
  id: string;
  name: string;
  description?: string;
  settings: SettingValues;
}

export interface CustomizationData {
  workspace: SettingValues;
  layouts: Record<string, SettingValues>;
  instances: Record<string, SettingValues>;
  profiles: CustomizationProfile[];
}

export type Terminology = Record<Locale, Record<string, string>>;

/** BE-51 limits: term keys, 1–120 characters of plain text (`<`, `>` and control characters refused). */
export const LABEL_KEY_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,119}$/;
export const LABEL_MAX_LENGTH = 120;
const TARGET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
export const PROFILE_NAME_MAX = 60;

export function entryId(scope: ServerScope, target?: string | null): string {
  return scope === 'workspace' ? 'workspace' : `${scope}:${target ?? ''}`;
}

/**
 * Instance ids are `<componentType>:<id>` in the frontend; BE-51 targets allow no colon, so the
 * stored target is `<componentType>.<id>` (e.g. `card.monitor.sel_queue`).
 */
export function encodeInstanceTarget(instanceId: string): string {
  const type = COMPONENT_TYPES.find((t) => instanceId.startsWith(`${t}:`));
  return type ? `${type}.${instanceId.slice(type.length + 1)}` : instanceId;
}

export function decodeInstanceTarget(target: string): string | null {
  const type = COMPONENT_TYPES.find((t) => target.startsWith(`${t}.`) && target.length > t.length + 1);
  return type ? `${type}:${target.slice(type.length + 1)}` : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Profiles are bundles of look and behavior: they hold settings valid at the workspace or device scope. */
export function sanitizeProfileSettings(input: unknown): SettingValues {
  return { ...sanitizeSettings(input, 'device'), ...sanitizeSettings(input, 'workspace') };
}

export function fromEntries(items: readonly unknown[]): CustomizationData {
  const data: CustomizationData = { workspace: {}, layouts: {}, instances: {}, profiles: [] };
  for (const item of items) {
    if (!isRecord(item) || typeof item.id !== 'string') continue;
    const target = typeof item.target === 'string' && TARGET_PATTERN.test(item.target) ? item.target : null;
    if (item.scope === 'profile' && target && typeof item.name === 'string') {
      data.profiles.push({ id: `profile:${target}`, name: cleanText(item.name).slice(0, PROFILE_NAME_MAX), settings: sanitizeProfileSettings(item.values) });
    } else if (item.scope === 'workspace') data.workspace = sanitizeSettings(item.values, 'workspace');
    else if (item.scope === 'layout' && target) data.layouts[target] = sanitizeSettings(item.values, 'layout');
    else if (item.scope === 'instance' && target) {
      const instanceId = decodeInstanceTarget(target);
      if (instanceId) data.instances[instanceId] = sanitizeSettings(item.values, 'instance');
    }
  }
  return data;
}

export function sanitizeLabels(input: unknown): Record<string, string> {
  if (!isRecord(input)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!LABEL_KEY_PATTERN.test(key) || typeof value !== 'string') continue;
    const text = cleanText(value);
    if (text.length > 0 && text.length <= LABEL_MAX_LENGTH && !/[<>]/.test(text)) out[key] = text;
  }
  return out;
}

function emptyTerminology(): Terminology {
  return Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, {}])) as Terminology;
}

/** 403 means a view-only client (access policy); anything else is a generic save failure. */
export function errorMessage(error: unknown): Message {
  if (error instanceof ApiError && error.status === 403) return { key: 'customization.errors.forbidden' };
  return { key: 'customization.errors.saveFailed' };
}

async function orEmpty<T>(load: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return empty;
    throw error;
  }
}

export interface CustomizationApi {
  load: () => Promise<CustomizationData>;
  saveScope: (scope: ServerScope, target: string | null, settings: SettingValues) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  saveProfile: (profile: CustomizationProfile) => Promise<void>;
  loadTerminology: () => Promise<Terminology>;
  saveTerminology: (locale: Locale, labels: Record<string, string>) => Promise<void>;
  /** Ids of the wall layouts (`orbit.layouts.json`) that can hold layout-scoped values. */
  listLayoutIds?: () => Promise<string[]>;
}

export function createCustomizationApi(options: ApiClientOptions = {}): CustomizationApi {
  const { request } = createApiClient(options);
  /** `workspace` → `/api/customization/workspace`; `layout:noc` → `/api/customization/layout/noc`. */
  const entryPath = (id: string) => {
    if (id === 'workspace') return '/api/customization/workspace';
    const at = id.indexOf(':');
    const scope = id.slice(0, at);
    const raw = id.slice(at + 1);
    const target = scope === 'instance' ? encodeInstanceTarget(raw) : raw;
    return `/api/customization/${encodeURIComponent(scope)}/${encodeURIComponent(target)}`;
  };

  return {
    async load(): Promise<CustomizationData> {
      const file = await orEmpty(() => request<{ items?: unknown }>('/api/customization'), { items: [] });
      return fromEntries(Array.isArray(file.items) ? file.items : []);
    },
    async saveScope(scope: ServerScope, target: string | null, settings: SettingValues): Promise<void> {
      if ((scope as string) === 'device') throw new Error('The device scope stays on this device');
      await request(entryPath(entryId(scope, target)), { method: 'PUT', body: { values: sanitizeSettings(settings, scope) } });
    },
    async deleteEntry(id: string): Promise<void> {
      await request(entryPath(id), { method: 'DELETE' });
    },
    async saveProfile(profile: CustomizationProfile): Promise<void> {
      const body = { name: cleanText(profile.name).slice(0, PROFILE_NAME_MAX), values: sanitizeProfileSettings(profile.settings) };
      await request(entryPath(profile.id), { method: 'PUT', body });
    },
    async loadTerminology(): Promise<Terminology> {
      const file = await orEmpty(() => request<{ items?: unknown }>('/api/terminology'), { items: [] });
      const out = emptyTerminology();
      for (const item of Array.isArray(file.items) ? file.items : []) {
        if (isRecord(item) && isLocale(item.id)) out[item.id] = sanitizeLabels(item.terms);
      }
      return out;
    },
    async saveTerminology(locale: Locale, labels: Record<string, string>): Promise<void> {
      await request(`/api/terminology/${encodeURIComponent(locale)}`, { method: 'PUT', body: { terms: sanitizeLabels(labels) } });
    },
    async listLayoutIds(): Promise<string[]> {
      const file = await orEmpty(() => request<{ items?: unknown }>('/api/layouts'), { items: [] });
      const items = Array.isArray(file.items) ? file.items : [];
      return items.flatMap((item) => (isRecord(item) && typeof item.id === 'string' && TARGET_PATTERN.test(item.id) ? [item.id] : []));
    },
  };
}
