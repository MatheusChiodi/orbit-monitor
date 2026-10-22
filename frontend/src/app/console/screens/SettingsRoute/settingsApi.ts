import type { SettingsApi, WorkspaceSettings } from '@/app/settings/SettingsScreen/SettingsScreen';
import { isLocale } from '@/shared/i18n/i18n';
import type { WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import type { ConsoleSource } from '../../consoleSource';

/**
 * Bridges the settings screen to `/api/settings/defaults` (BE-40 workspace defaults), `/api/config/health`
 * and the BE-37 zip export/import.
 */
export function toSettingsApi(source: ConsoleSource): SettingsApi {
  let last: WorkspacePreferenceDefaults = {};
  return {
    getAccess: source.getAccess,
    getSettings: async () => {
      last = await source.getWorkspaceDefaults();
      const item: WorkspaceSettings = {
        id: 'default',
        defaultLocale: isLocale(last.locale) ? last.locale : undefined,
        theme: last.theme,
        animationLevel: last.animation,
        density: last.density,
      };
      return { version: 1, items: [item] };
    },
    saveSettings: async (settings) => {
      const next: WorkspacePreferenceDefaults = {
        ...last,
        locale: settings.defaultLocale ?? last.locale,
        theme: settings.theme ?? last.theme,
        animation: (settings.animationLevel as WorkspacePreferenceDefaults['animation']) ?? last.animation,
        density: (settings.density as WorkspacePreferenceDefaults['density']) ?? last.density,
      };
      last = await source.saveWorkspaceDefaults(next).then((saved) => ({ ...next, ...saved }));
    },
    getConfigHealth: source.getConfigHealth,
    exportConfig: source.exportConfig,
    previewImport: (archive) => source.importConfig(archive, true),
    applyImport: async (archive) => {
      await source.importConfig(archive, false);
    },
  };
}
