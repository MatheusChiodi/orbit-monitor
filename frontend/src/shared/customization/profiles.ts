import type { Message } from '@/shared/i18n/message';
import { PROFILE_NAME_MAX, sanitizeProfileSettings, type CustomizationProfile } from './api';
import type { CustomizationStore } from './store';
import type { Scope, SettingValues } from './types';
import { cleanText } from './validate';

/** FE-57: profiles shipped with Orbit (docs/07 §5); names and descriptions are translated. */
export interface BuiltInProfile extends CustomizationProfile {
  builtIn: true;
  slug: 'orbit-default' | 'tv-wall' | 'compact-console' | 'accessible';
}

function builtIn(slug: BuiltInProfile['slug'], settings: SettingValues): BuiltInProfile {
  return { id: `builtin:${slug}`, slug, name: slug, builtIn: true, settings };
}

export const BUILT_IN_PROFILES: readonly BuiltInProfile[] = [
  builtIn('orbit-default', {}),
  builtIn('tv-wall', { 'typography.scale': 1.2, 'shape.glass': false, 'card.monitor.variant': 'detailed', 'density.panelPadding': 'roomy', 'card.monitor.colorBands': true }),
  builtIn('compact-console', { 'density.level': 'compact', 'typography.baseSize': 14, 'card.monitor.variant': 'compact', 'density.panelPadding': 'tight' }),
  builtIn('accessible', {
    'typography.scale': 1.2,
    'typography.baseSize': 16,
    'typography.letterSpacing': 'wide',
    'shape.borderWidth': 'thick',
    'shape.surfaces': 'flat',
    'shape.glass': false,
    'motion.level': 'minimal',
  }),
];

export type ProfileTarget = { scope: 'device' } | { scope: 'layout'; layoutId: string };

/** Replaces the values of the target scope with the profile's (Orbit default clears it). */
export async function applyProfile(store: CustomizationStore, profile: CustomizationProfile, target: ProfileTarget): Promise<void> {
  await store.getState().replaceScope(target.scope, profile.settings, target.scope === 'layout' ? target.layoutId : null);
}

function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.slice(0, 40) || 'profile';
}

export function uniqueProfileId(name: string, existing: readonly CustomizationProfile[]): string {
  const base = `profile:${slugify(name)}`;
  const taken = new Set(existing.map((p) => p.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** New custom profile from what is stored at one scope. */
export function profileFromScope(store: CustomizationStore, name: string, scope: Scope, existing: readonly CustomizationProfile[], target: string | null = null): CustomizationProfile {
  const clean = cleanText(name).slice(0, PROFILE_NAME_MAX);
  return { id: uniqueProfileId(clean, existing), name: clean, settings: sanitizeProfileSettings(store.getState().valuesAt(scope, target)) };
}

export function duplicateProfile(profile: CustomizationProfile, name: string, existing: readonly CustomizationProfile[]): CustomizationProfile {
  const clean = cleanText(name).slice(0, PROFILE_NAME_MAX);
  return { id: uniqueProfileId(clean, existing), name: clean, settings: { ...profile.settings } };
}

export const PROFILE_FILE_VERSION = 1;
/** Same file as BE-51 `GET /api/customization/profiles/{id}/export`. */
export const PROFILE_FILE_FORMAT = 'orbit.customization-profile';

/** Export file: name and registry settings only (no secrets exist in the registry). */
export function exportProfile(profile: CustomizationProfile): string {
  return JSON.stringify({ format: PROFILE_FILE_FORMAT, version: PROFILE_FILE_VERSION, name: profile.name, values: sanitizeProfileSettings(profile.settings) }, null, 2);
}

export type ParseProfileResult = { ok: true; profile: CustomizationProfile } | { ok: false; error: Message };

export function parseProfileFile(text: string, existing: readonly CustomizationProfile[]): ParseProfileResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, error: { key: 'customization.profiles.file.invalidJson' } };
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return { ok: false, error: { key: 'customization.profiles.file.invalidJson' } };
  const { format, version, name: rawName, values } = doc as { format?: unknown; version?: unknown; name?: unknown; values?: unknown };
  if (version !== PROFILE_FILE_VERSION) {
    const shown = typeof version === 'number' || typeof version === 'string' ? version : '?';
    return { ok: false, error: { key: 'customization.profiles.file.unsupportedVersion', params: { version: shown } } };
  }
  const name = typeof rawName === 'string' ? cleanText(rawName).slice(0, PROFILE_NAME_MAX) : '';
  if (format !== PROFILE_FILE_FORMAT || !name) return { ok: false, error: { key: 'customization.profiles.file.invalid' } };
  return { ok: true, profile: { id: uniqueProfileId(name, existing), name, settings: sanitizeProfileSettings(values) } };
}
