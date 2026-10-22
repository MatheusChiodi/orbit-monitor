import { useTranslation } from 'react-i18next';
import { CustomizationScreen } from '@/domains/customization/CustomizationScreen';
import type { OperatorStore } from '@/domains/security/operator';
import { DevicePreferences } from '@/domains/workspace/DevicePreferences';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { useConsole } from '../ConsoleContext';
import { routeHref, type ConsoleRoute } from '../routes';
import { AuditScreen } from '../screens/AuditScreen';
import { DependenciesScreen } from '../screens/DependenciesScreen';
import { IncidentScreen } from '../screens/IncidentScreen';
import { IncidentsScreen } from '../screens/IncidentsScreen';
import { MaintenanceScreen } from '../screens/MaintenanceScreen';
import { MonitorDetailScreen } from '../screens/MonitorDetailScreen';
import { MonitorsScreen } from '../screens/MonitorsScreen';
import { NewMonitorScreen } from '../screens/NewMonitorScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ScreenTitle } from '../screens/ScreenStatus';
import { SettingsRoute } from '../screens/SettingsRoute';
import { StatusPagesScreen } from '../screens/StatusPagesScreen';
import { AppearancePage } from '../AppearancePage';
import { LayoutsPage } from '../LayoutsPage';
import { useGroups, useMonitors } from '../ConsoleContext';
import type { LayoutsApi } from '@/domains/workspace/layout/layoutsApi';
import type { WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import type { ThemesClient } from '@/shared/theme/customThemes';

/** API clients of the theming and wall layout screens (FE-03/04, FE-11). */
export interface ConsoleServices {
  themesClient: ThemesClient;
  layoutsApi: Pick<LayoutsApi, 'list' | 'save'>;
  saveDefaults: (defaults: WorkspacePreferenceDefaults) => Promise<WorkspacePreferenceDefaults>;
}

export interface ConsoleRoutesProps {
  route: ConsoleRoute;
  preferences: PreferencesStore;
  operatorStore: OperatorStore;
  services: ConsoleServices;
  onMonitorSaved: (name: string) => void;
}

function LayoutsRoute({ services, layoutId }: { services: ConsoleServices; layoutId: string | null }) {
  const { t } = useTranslation();
  const { editable } = useConsole();
  const monitors = useMonitors();
  const groups = useGroups();
  return (
    <>
      <ScreenTitle>{t('console.layouts')}</ScreenTitle>
      <LayoutsPage api={services.layoutsApi} editable={editable} selectedId={layoutId} monitors={monitors.data ?? []} groups={groups.data ?? []} />
    </>
  );
}

/** One screen per hash route; view-only clients asking for the form get the list. */
export function ConsoleRoutes({ route, preferences, operatorStore, services, onMonitorSaved }: ConsoleRoutesProps) {
  const { t } = useTranslation();
  const { editable } = useConsole();
  switch (route.name) {
    case 'new-monitor':
      return editable ? <NewMonitorScreen kind={route.kind} onSaved={onMonitorSaved} /> : <MonitorsScreen />;
    case 'monitor':
      return <MonitorDetailScreen id={route.id} />;
    case 'incidents':
      return <IncidentsScreen />;
    case 'incident':
      return <IncidentScreen id={route.id} />;
    case 'maintenance':
      return <MaintenanceScreen />;
    case 'dependencies':
      return <DependenciesScreen />;
    case 'reports':
      return <ReportsScreen />;
    case 'status-pages':
      return <StatusPagesScreen />;
    case 'audit':
      return <AuditScreen />;
    case 'settings':
      return <SettingsRoute operatorStore={operatorStore} />;
    case 'preferences':
      return (
        <>
          <ScreenTitle>{t('preferences.title')}</ScreenTitle>
          <DevicePreferences store={preferences} />
        </>
      );
    case 'customization':
      return (
        <>
          <ScreenTitle>{t('customization.title')}</ScreenTitle>
          <CustomizationScreen editable={editable} />
        </>
      );
    case 'appearance':
      return (
        <>
          <ScreenTitle>{t('console.appearance')}</ScreenTitle>
          <AppearancePage
            themesClient={services.themesClient}
            editable={editable}
            onSetWorkspaceDefault={(theme) =>
              void services
                .saveDefaults({ ...preferences.getState().defaults, theme })
                .then((saved) => preferences.getState().setWorkspaceDefaults(saved))
                .catch(() => {})
            }
          />
        </>
      );
    case 'layouts':
      return <LayoutsRoute services={services} layoutId={null} />;
    case 'layout':
      return <LayoutsRoute services={services} layoutId={route.id} />;
    case 'not-found':
      return (
        <>
          <ScreenTitle>{t('screens.notFound')}</ScreenTitle>
          <a href={routeHref({ name: 'monitors' })} className="text-info hover:underline">
            {t('screens.backToMonitors')}
          </a>
        </>
      );
    default:
      return <MonitorsScreen />;
  }
}
