import type { WallLayout } from '@/domains/workspace/layout/layoutsApi';
import { emptyConfigFile, type ConfigItem } from '@/shared/api/configResources';
import type { ThemesClient } from '@/shared/theme/customThemes';
import type { ConsoleServices } from './ConsoleRoutes';

/**
 * `?demo` never talks to a server: custom themes, wall layouts and workspace defaults are kept in
 * memory for the session (FE-63; the audit saw 502s and socket errors in demo mode).
 */
export function createDemoServices(): ConsoleServices {
  const themes = new Map<string, ConfigItem>();
  const layouts = new Map<string, WallLayout>();
  const themesClient: ThemesClient = {
    list: (async () => ({ ...emptyConfigFile(), items: [...themes.values()] })) as ThemesClient['list'],
    create: (async (_resource: string, item: Partial<ConfigItem>) => {
      const saved = { ...item, id: item.id ?? `demo-${themes.size + 1}` };
      themes.set(saved.id, saved);
      return saved;
    }) as ThemesClient['create'],
    update: (async (_resource: string, id: string, item: Partial<ConfigItem>) => {
      const saved = { ...themes.get(id), ...item, id };
      themes.set(id, saved);
      return saved;
    }) as ThemesClient['update'],
    remove: async (_resource, id) => {
      themes.delete(id);
    },
  };
  return {
    themesClient,
    layoutsApi: {
      list: async () => [...layouts.values()],
      save: async (layout) => {
        layouts.set(layout.id, layout);
        return layout;
      },
    },
    saveDefaults: async (defaults) => defaults,
  };
}
