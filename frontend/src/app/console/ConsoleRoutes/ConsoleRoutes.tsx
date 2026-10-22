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
import { MonitorsScreen } from '../screens/MonitorsScreen';
import { NewMonitorScreen } from '../screens/NewMonitorScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ScreenTitle } from '../screens/ScreenStatus';
import { SettingsRoute } from '../screens/SettingsRoute';
import { StatusPagesScreen } from '../screens/StatusPagesScreen';

export interface ConsoleRoutesProps {
  route: ConsoleRoute;
  preferences: PreferencesStore;
  operatorStore: OperatorStore;
  onMonitorSaved: (name: string) => void;
}

/** One screen per hash route; view-only clients asking for the form get the list. */
export function ConsoleRoutes({ route, preferences, operatorStore, onMonitorSaved }: ConsoleRoutesProps) {
  const { t } = useTranslation();
  const { editable } = useConsole();
  switch (route.name) {
    case 'new-monitor':
      return editable ? <NewMonitorScreen kind={route.kind} onSaved={onMonitorSaved} /> : <MonitorsScreen />;
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
