import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AdvancedSettings } from '@/app/settings/AdvancedSettings';
import { GeneralSettings } from '@/app/settings/GeneralSettings';
import { SettingsNav } from '@/app/settings/SettingsNav';
import type { SettingsSection } from '@/app/settings/sections';
import { ConnectionsSettings } from '@/domains/connections/ConnectionsSettings';
import type { LayoutsApi } from '@/domains/workspace/layout/layoutsApi';
import type { PreferencesStore, WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import type { ThemesClient } from '@/shared/theme/customThemes';
import { PageHeader, useToast } from '@/shared/ui';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { AppearancePage } from '../../AppearancePage';
import { LayoutsPage } from '../../LayoutsPage';
import { toSettingsApi } from './settingsApi';

export { SETTINGS_SECTIONS, isSettingsSection, settingsHref, type SettingsSection } from '@/app/settings/sections';

/** API clients the Settings sections need (structurally the console's `ConsoleServices`). */
export interface SettingsServices {
  themesClient: ThemesClient;
  layoutsApi: Pick<LayoutsApi, 'list' | 'save'>;
  saveDefaults: (defaults: WorkspacePreferenceDefaults) => Promise<WorkspacePreferenceDefaults>;
}

export interface SettingsRouteProps {
  section: SettingsSection;
  /** `#/settings/wall-layouts/:id`. */
  layoutId?: string | null;
  preferences: PreferencesStore;
  services: SettingsServices;
}

/** FE-72: the one Settings area — sub-nav plus General · Appearance · Wall layouts · Connections · Advanced. */
export function SettingsRoute({ section, layoutId = null, preferences, services }: SettingsRouteProps) {
  const { t } = useTranslation();
  const { source, editable, demo } = useConsole();
  const { toast } = useToast();
  const api = useMemo(() => toSettingsApi(source), [source]);
  const monitors = useMonitors();
  const groups = useGroups();
  const title = t(`settingsHub.nav.${section}`);

  const saveWorkspaceDefaults = (patch: WorkspacePreferenceDefaults, done: string) =>
    void services
      .saveDefaults({ ...preferences.getState().defaults, ...patch })
      .then((saved) => {
        preferences.getState().setWorkspaceDefaults(saved);
        toast({ title: done, tone: 'OK' });
      })
      .catch((e: unknown) => toast({ title: t('settingsHub.general.saveFailed', { message: e instanceof Error ? e.message : String(e) }), tone: 'DOWN' }));

  let body;
  switch (section) {
    case 'appearance':
      body = (
        <AppearancePage
          themesClient={services.themesClient}
          editable={editable}
          preferences={preferences}
          onSetWorkspaceDefault={(theme, display) => saveWorkspaceDefaults({ theme, ...display }, t('settingsHub.appearance.madeDefault', { name: theme }))}
        />
      );
      break;
    case 'wall-layouts':
      body = <LayoutsPage api={services.layoutsApi} editable={editable} selectedId={layoutId} monitors={monitors.data ?? []} groups={groups.data ?? []} />;
      break;
    case 'connections':
      body = <ConnectionsSettings source={source} demo={demo} editable={editable} />;
      break;
    case 'advanced':
      body = <AdvancedSettings preferences={preferences} editable={editable} />;
      break;
    default:
      body = <GeneralSettings api={api} preferences={preferences} />;
  }

  return (
    <div className="flex flex-col">
      <PageHeader title={t('settingsHub.title')} description={t('settingsHub.description')} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:sticky lg:top-4 lg:w-56 lg:shrink-0">
          <SettingsNav current={section} />
        </div>
        <section aria-labelledby="settings-section-title" className="flex min-w-0 flex-1 flex-col gap-4">
          <h2 id="settings-section-title" className="m-0 text-lg font-semibold text-text">
            {title}
          </h2>
          {body}
        </section>
      </div>
    </div>
  );
}
