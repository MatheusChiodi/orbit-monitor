import { sanitizePreferences, type WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import { ApiError, createApiClient, type ApiClientOptions } from './client';

/**
 * BE-40 workspace defaults (theme, animation level, density, locale, scale) from `orbit.settings.json`.
 * BE-40: `GET/PUT /api/settings/defaults` → `{ theme, animation, density, locale, scale }` (the frontend names);
 * `animationLevel` is accepted too, and older backends without the endpoint fall back to `GET /api/settings`.
 */
type RawDefaults = Record<string, unknown>;

function toDefaults(raw: RawDefaults): WorkspacePreferenceDefaults {
  const clean = sanitizePreferences({
    theme: raw.theme,
    animation: raw.animationLevel ?? raw.animation,
    density: raw.density,
    locale: raw.locale ?? raw.defaultLocale,
    scale: raw.scale,
  });
  delete clean.operatorName;
  return clean;
}

export async function fetchWorkspaceDefaults(options: Pick<ApiClientOptions, 'fetch' | 'baseUrl'> = {}): Promise<WorkspacePreferenceDefaults> {
  const { request } = createApiClient(options);
  try {
    return toDefaults(await request<RawDefaults>('/api/settings/defaults'));
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) return {};
  }
  try {
    return toDefaults(await request<RawDefaults>('/api/settings'));
  } catch {
    return {};
  }
}

/** Editors only (access policy); the backend answers 403 for view-only clients. */
export async function saveWorkspaceDefaults(
  defaults: WorkspacePreferenceDefaults,
  options: Pick<ApiClientOptions, 'fetch' | 'baseUrl' | 'getOperator'> = {},
): Promise<WorkspacePreferenceDefaults> {
  const { request } = createApiClient(options);
  return toDefaults(await request<RawDefaults>('/api/settings/defaults', { method: 'PUT', body: defaults }));
}
