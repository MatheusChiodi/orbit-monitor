import type { SettingsApi, WorkspaceSettings } from '@/app/settings/SettingsScreen/SettingsScreen';
import type { OrbitSettingsRecord } from '@/shared/api/consoleTypes';
import { isLocale } from '@/shared/i18n/i18n';
import type { ConsoleSource } from '../../consoleSource';

/** Bridges the settings screen to `/api/settings`, `/api/config/health` and the BE-37 zip export/import. */
export function toSettingsApi(source: ConsoleSource): SettingsApi {
  let last: OrbitSettingsRecord = {};
  return {
    getAccess: source.getAccess,
    getSettings: async () => {
      last = await source.getSettings();
      const item: WorkspaceSettings = {
        id: last.id ?? 'default',
        defaultLocale: isLocale(last.locale) ? last.locale : undefined,
        theme: last.theme ?? undefined,
        animationLevel: last.animationLevel ?? undefined,
        historyHours: last.historyHours ?? undefined,
      };
      return { version: 1, items: [item] };
    },
    saveSettings: async (settings) => {
      last = await source.saveSettings({
        ...last,
        id: settings.id,
        locale: settings.defaultLocale ?? last.locale,
        theme: settings.theme ?? last.theme,
        animationLevel: settings.animationLevel ?? last.animationLevel,
        historyHours: settings.historyHours ?? last.historyHours,
      });
    },
    getConfigHealth: source.getConfigHealth,
    exportConfig: source.exportConfig,
    previewImport: (archive) => source.importConfig(archive, true),
    applyImport: async (archive) => {
      await source.importConfig(archive, false);
    },
  };
}
