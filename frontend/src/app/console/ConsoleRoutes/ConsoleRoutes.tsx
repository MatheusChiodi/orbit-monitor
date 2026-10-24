import { lazy, Suspense, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { Button, EmptyState, IconSearch } from '@/shared/ui';
import { useConsole } from '../ConsoleContext';
import type { ConsoleRoute } from '../routes';
import { AuditScreen } from '../screens/AuditScreen';
import { DependenciesScreen } from '../screens/DependenciesScreen';
import { IncidentScreen } from '../screens/IncidentScreen';
import { IncidentsScreen } from '../screens/IncidentsScreen';
import { MaintenanceScreen } from '../screens/MaintenanceScreen';
import { MonitorDetailScreen } from '../screens/MonitorDetailScreen';
import { MonitorsScreen } from '../screens/MonitorsScreen';
import { NewMonitorScreen } from '../screens/NewMonitorScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ScreenSkeleton } from '../screens/ScreenStatus';
import { SettingsRoute } from '../screens/SettingsRoute';
import { StatusPagesScreen } from '../screens/StatusPagesScreen';
import type { LayoutsApi } from '@/domains/workspace/layout/layoutsApi';
import type { WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import type { ThemesClient } from '@/shared/theme/customThemes';

/** API clients of the theming and wall layout screens (FE-03/04, FE-11). */
export interface ConsoleServices {
  themesClient: ThemesClient;
  /** `remove` is optional: the Delete action of a layout only shows when the client has it. */
  layoutsApi: Pick<LayoutsApi, 'list' | 'save'> & Partial<Pick<LayoutsApi, 'remove'>>;
  saveDefaults: (defaults: WorkspacePreferenceDefaults) => Promise<WorkspacePreferenceDefaults>;
}

export interface ConsoleRoutesProps {
  route: ConsoleRoute;
  preferences: PreferencesStore;
  services: ConsoleServices;
  onMonitorSaved: (name: string) => void;
}

/** `#/monitors/:id/edit` (owned by the monitor-form screens); resolved at build time so a missing file never breaks the shell. */
const editScreens = import.meta.glob<{ default: ComponentType<{ id: string }> }>('../screens/EditMonitorScreen/EditMonitorScreen.tsx');
const loadEditScreen = Object.values(editScreens)[0];
const EditMonitorScreen = loadEditScreen ? lazy(loadEditScreen) : null;

function NotFound() {
  const { t } = useTranslation();
  const { navigate } = useConsole();
  return (
    <EmptyState
      icon={IconSearch}
      title={t('screens.notFound')}
      headingLevel={2}
      action={
        <Button variant="primary" onClick={() => navigate({ name: 'monitors' })}>
          {t('screens.backToMonitors')}
        </Button>
      }
    >
      {t('screens.shell.notFoundBody')}
    </EmptyState>
  );
}

/** One screen per hash route; view-only clients asking for a form get the matching read-only screen. */
export function ConsoleRoutes({ route, preferences, services, onMonitorSaved }: ConsoleRoutesProps) {
  const { editable } = useConsole();
  switch (route.name) {
    case 'new-monitor':
      return editable ? <NewMonitorScreen kind={route.kind} onSaved={onMonitorSaved} /> : <MonitorsScreen />;
    case 'monitor':
      return <MonitorDetailScreen id={route.id} />;
    case 'edit-monitor':
      if (!editable || !EditMonitorScreen) return <MonitorDetailScreen id={route.id} />;
      return (
        <Suspense fallback={<ScreenSkeleton />}>
          <EditMonitorScreen id={route.id} />
        </Suspense>
      );
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
      return <SettingsRoute section={route.section} layoutId={route.layoutId} preferences={preferences} services={services} />;
    case 'not-found':
      return <NotFound />;
    default:
      return <MonitorsScreen />;
  }
}
