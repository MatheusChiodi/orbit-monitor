import { sanitizePreferences, type WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import { ApiError, createApiClient, type ApiClientOptions } from './client';

/**
 * BE-40 workspace defaults (theme, animation level, density, locale, scale) from `orbit.settings.json`.
 * Assumed contract: `GET /api/settings/defaults` → `{ theme?, animationLevel?, density?, locale?, scale? }`;
 * older backends only have `GET /api/settings` (same field names), used as a fallback.
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
