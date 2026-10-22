import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { canEdit } from '@/domains/security/access';
import type { OperatorStore } from '@/domains/security/operator';
import { OperatorPrompt } from '@/domains/security/OperatorPrompt';
import { ViewOnlyBanner } from '@/domains/security/ViewOnlyBanner';
import { CustomizationRuntime } from '@/domains/customization/CustomizationRuntime';
import { CustomizeLayer } from '@/domains/customization/CustomizeLayer';
import { CustomizeModeProvider } from '@/domains/customization/CustomizeModeProvider';
import type { AccessInfo } from '@/shared/api/types';
import { FxBackground } from '@/shared/fx/FxBackground';
import { FxDowngradeNotice } from '@/shared/fx/FxDowngradeNotice';
import { FxProvider } from '@/shared/fx/FxProvider';
import { OrbitIntro } from '@/shared/fx/OrbitIntro';
import { AnimationLevelProvider, systemPrefersReducedMotion } from '@/shared/motion/animationLevel';
import { fxLevelFor, parseMotionParam, resolveMotion } from '@/shared/motion/motionSettings';
import type { CustomizationApi } from '@/shared/customization/api';
import { createCustomizationStore, type CustomizationStore } from '@/shared/customization/store';
import { createTerminologyStore } from '@/shared/customization/terminology';
import { useAppearance } from '@/shared/customization/useAppearance';
import { createPreferencesStore, type PreferencesStore } from '@/shared/preferences/preferences';
import { ConsoleHeader } from './ConsoleHeader';
import { ConsolePalette } from './ConsolePalette';
import { ConsoleProvider } from './ConsoleContext';
import { ConsoleRoutes } from './ConsoleRoutes';
import { ScreenTransition } from './ScreenTransition';
import type { IncidentFeedConnector } from './NotificationsBell';
import { routeHref, useHashRoute, type ConsoleRoute } from './routes';
import { DEFAULT_SHORTCUTS, ShortcutsHelp, useShortcuts } from './ShortcutsHelp';
import { usePreferenceEffects } from './usePreferenceEffects';
import { ConsoleTheme } from './ConsoleTheme';
import type { ConsoleServices } from './ConsoleRoutes';
import { createLayoutsApi, type LayoutsApi } from '@/domains/workspace/layout/layoutsApi';
import { createConfigClient } from '@/shared/api/configResources';
import { saveWorkspaceDefaults } from '@/shared/api/workspaceDefaults';
import type { WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import type { ThemesClient } from '@/shared/theme/customThemes';
import { createConsoleSource, DEMO_ACCESS, type ConsoleApi } from './consoleSource';
import { ServerUnreachable } from './ServerUnreachable';

export interface ConsoleAppProps {
  api: ConsoleApi;
  operatorStore: OperatorStore;
  queryClient?: QueryClient;
  /** FE-50: device preferences; created from `localStorage` when omitted. */
  preferencesStore?: PreferencesStore;
  /** FE-38: live incident changes (the wall WebSocket); polling only when omitted. */
  connectFeed?: IncidentFeedConnector;
  /** CORE-21: `orbit.customization.json` / `orbit.terminology.json` (BE-51); device-only when omitted. */
  customizationApi?: CustomizationApi;
  customizationStore?: CustomizationStore;
  /** FE-04: custom themes (`/api/themes`); created with the operator header when omitted. */
  configClient?: ThemesClient;
  /** FE-11: wall layouts (`/api/layouts`). */
  layoutsApi?: Pick<LayoutsApi, 'list' | 'save'>;
  /** BE-40: saves the workspace defaults (`PUT /api/settings/defaults`, editors only). */
  saveDefaults?: (defaults: WorkspacePreferenceDefaults) => Promise<WorkspacePreferenceDefaults>;
  /** Demo data in memory, only when explicitly asked for (`index.html?demo`); never a silent fallback. */
  demo?: boolean;
}

/** `index.html#/settings/preferences` opens the device preferences screen. */
export const PREFERENCES_HASH = routeHref({ name: 'preferences' });
/** `index.html#/settings/customization` opens the customization screen (CORE-21). */
export const CUSTOMIZATION_HASH = routeHref({ name: 'customization' });

/** Probe data stays in memory only: no persisted query cache, short garbage collection. */
function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 60_000 } } });
}

interface WorkspaceProps {
  api: ConsoleApi;
  access: AccessInfo;
  demo: boolean;
  operator: string;
  onChangeName: () => void;
  preferences: PreferencesStore;
  operatorStore: OperatorStore;
  connectFeed?: IncidentFeedConnector;
  services: ConsoleServices;
}

function Workspace({ api, access, demo, operator, onChangeName, preferences, operatorStore, connectFeed, services }: WorkspaceProps) {
  const { t } = useTranslation();
  const source = useMemo(() => createConsoleSource(api, demo), [api, demo]);
  // FE-50: workspace defaults (`/api/settings/defaults`, BE-40) sit under this device's own choices.
  const defaults = useQuery({ queryKey: ['settings-defaults', demo], queryFn: source.getWorkspaceDefaults, enabled: !demo });
  useEffect(() => {
    if (defaults.data) preferences.getState().setWorkspaceDefaults(defaults.data);
  }, [defaults.data, preferences]);
  const [route, navigate] = useHashRoute();
  const [notice, setNotice] = useState<string | null>(null);
  const editable = canEdit(access.mode);
  const context = useMemo(
    () => ({ source, access, editable, demo, operator, navigate }),
    [source, access, editable, demo, operator, navigate],
  );

  const go = (next: ConsoleRoute) => {
    setNotice(null);
    navigate(next);
  };
  const openNew = () => {
    if (editable) go({ name: 'new-monitor' });
  };
  useShortcuts({ 'monitor.new': openNew });

  return (
    <CustomizeModeProvider editable={editable}>
    <ConsoleProvider value={context}>
      <div className="min-h-screen">
        <ConsoleHeader route={route} onChangeName={onChangeName} connectFeed={connectFeed} />
        <ConsolePalette onNewMonitor={openNew} onNavigate={go} />
        <ShortcutsHelp shortcuts={DEFAULT_SHORTCUTS} />
        <main className="mx-auto flex max-w-[80rem] flex-col gap-[1rem] p-[1.4rem]">
          <ViewOnlyBanner mode={access.mode} />
          {notice && (
            <p className="m-0 rounded-[0.45rem] border border-ok/50 bg-ok/12 px-[0.8rem] py-[0.5rem] text-ok-text">{notice}</p>
          )}
          <ScreenTransition routeKey={routeHref(route)}>
          <ConsoleRoutes
            route={route}
            preferences={preferences}
            operatorStore={operatorStore}
            services={services}
            onMonitorSaved={(name) => {
              navigate({ name: 'monitors' });
              setNotice(t('console.monitors.saved', { name }));
            }}
          />
          </ScreenTransition>
        </main>
        <CustomizeLayer />
      </div>
    </ConsoleProvider>
    </CustomizeModeProvider>
  );
}

interface ShellProps {
  api: ConsoleApi;
  demo: boolean;
  operatorStore: OperatorStore;
  preferences: PreferencesStore;
  connectFeed?: IncidentFeedConnector;
  services: ConsoleServices;
}

function Shell({ api, demo, operatorStore, preferences, connectFeed, services }: ShellProps) {
  const { t } = useTranslation();
  const operator = useStore(operatorStore, (s) => s.name);
  const setName = useStore(operatorStore, (s) => s.setName);
  const [renaming, setRenaming] = useState(false);
  const access = useQuery({ queryKey: ['access'], queryFn: api.getAccess, enabled: Boolean(operator) && !demo });

  if (!operator || renaming) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-[1.2rem] p-[1.4rem]">
        <OrbitIntro id="orbit-boot" tilt className="w-[min(34rem,90vw)]" />
        <OperatorPrompt
          initialName={operator ?? ''}
          onSubmit={(name) => {
            setName(name);
            setRenaming(false);
          }}
        />
      </main>
    );
  }

  if (demo) {
    return (
      <Workspace
        api={api}
        demo
        access={DEMO_ACCESS}
        operator={operator}
        onChangeName={() => setRenaming(true)}
        preferences={preferences}
        operatorStore={operatorStore}
        connectFeed={connectFeed}
        services={services}
      />
    );
  }
  if (access.isPending) return <p className="p-[1.4rem] text-muted">{t('app.loading')}</p>;
  if (access.isError) return <ServerUnreachable onRetry={() => void access.refetch()} retrying={access.isFetching} />;

  return (
    <Workspace
      api={api}
      demo={false}
      access={access.data}
      operator={operator}
      onChangeName={() => setRenaming(true)}
      preferences={preferences}
      operatorStore={operatorStore}
      connectFeed={connectFeed}
      services={services}
    />
  );
}

/** Console: no login; the operator declares a name once and the API decides edit vs. view-only. */
export function ConsoleApp({
  api,
  operatorStore,
  queryClient,
  preferencesStore,
  connectFeed,
  customizationApi,
  customizationStore,
  configClient,
  layoutsApi,
  saveDefaults,
  demo = false,
}: ConsoleAppProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  const [preferences] = useState(() => preferencesStore ?? createPreferencesStore());
  const [customization] = useState(() => customizationStore ?? createCustomizationStore({ api: customizationApi, preferences }));
  const [terminology] = useState(() => createTerminologyStore(customizationApi));
  const [services] = useState<ConsoleServices>(() => {
    const getOperator = () => operatorStore.getState().name;
    return {
      themesClient: configClient ?? createConfigClient({ getOperator }),
      layoutsApi: layoutsApi ?? createLayoutsApi({ getOperator }),
      saveDefaults: saveDefaults ?? ((d) => saveWorkspaceDefaults(d, { getOperator })),
    };
  });
  const effective = usePreferenceEffects(preferences, operatorStore);
  useAppearance(customization);
  // FE-06 precedence: reduced motion → ?motion= → this device (preset + overrides; workspace defaults are merged in).
  const [url] = useState(() => (typeof window === 'undefined' ? null : parseMotionParam(window.location.search)));
  const motion = resolveMotion({
    reducedMotion: systemPrefersReducedMotion(),
    url,
    device: { level: effective.animation, overrides: effective.motion },
  });
  return (
    <QueryClientProvider client={client}>
      <AnimationLevelProvider level={motion.level} settings={motion.settings}>
        <ConsoleTheme preferences={preferences} themesClient={services.themesClient}>
        <FxProvider level={fxLevelFor(motion.settings, motion.level)}>
          <FxBackground />
          <div className="fx-layer">
            <CustomizationRuntime store={customization} terminology={terminology}>
              <Shell api={api} demo={demo} operatorStore={operatorStore} preferences={preferences} connectFeed={connectFeed} services={services} />
            </CustomizationRuntime>
          </div>
          <FxDowngradeNotice />
        </FxProvider>
        </ConsoleTheme>
      </AnimationLevelProvider>
    </QueryClientProvider>
  );
}
