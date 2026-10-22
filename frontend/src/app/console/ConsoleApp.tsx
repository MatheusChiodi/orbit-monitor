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
import type { IncidentFeedConnector } from './NotificationsBell';
import { routeHref, useHashRoute, type ConsoleRoute } from './routes';
import { DEFAULT_SHORTCUTS, ShortcutsHelp, useShortcuts } from './ShortcutsHelp';
import { usePreferenceEffects } from './usePreferenceEffects';
import { createConsoleSource, type ConsoleApi } from './consoleSource';

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
}

function Workspace({ api, access, demo, operator, onChangeName, preferences, operatorStore, connectFeed }: WorkspaceProps) {
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
          <ConsoleRoutes
            route={route}
            preferences={preferences}
            operatorStore={operatorStore}
            onMonitorSaved={(name) => {
              navigate({ name: 'monitors' });
              setNotice(t('console.monitors.saved', { name }));
            }}
          />
        </main>
        <CustomizeLayer />
      </div>
    </ConsoleProvider>
    </CustomizeModeProvider>
  );
}

interface ShellProps {
  api: ConsoleApi;
  operatorStore: OperatorStore;
  preferences: PreferencesStore;
  connectFeed?: IncidentFeedConnector;
}

function Shell({ api, operatorStore, preferences, connectFeed }: ShellProps) {
  const { t } = useTranslation();
  const operator = useStore(operatorStore, (s) => s.name);
  const setName = useStore(operatorStore, (s) => s.setName);
  const [renaming, setRenaming] = useState(false);
  const access = useQuery({ queryKey: ['access'], queryFn: api.getAccess, enabled: Boolean(operator) });

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

  if (access.isPending) return <p className="p-[1.4rem] text-muted">{t('app.loading')}</p>;

  const demo = access.isError;
  return (
    <Workspace
      api={api}
      demo={demo}
      access={access.data ?? { mode: 'edit', client: 'loopback' }}
      operator={operator}
      onChangeName={() => setRenaming(true)}
      preferences={preferences}
      operatorStore={operatorStore}
      connectFeed={connectFeed}
    />
  );
}

/** Console: no login; the operator declares a name once and the API decides edit vs. view-only. */
export function ConsoleApp({ api, operatorStore, queryClient, preferencesStore, connectFeed, customizationApi, customizationStore }: ConsoleAppProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  const [preferences] = useState(() => preferencesStore ?? createPreferencesStore());
  const [customization] = useState(() => customizationStore ?? createCustomizationStore({ api: customizationApi, preferences }));
  const [terminology] = useState(() => createTerminologyStore(customizationApi));
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
        <FxProvider level={fxLevelFor(motion.settings, motion.level)}>
          <FxBackground />
          <div className="fx-layer">
            <CustomizationRuntime store={customization} terminology={terminology}>
              <Shell api={api} operatorStore={operatorStore} preferences={preferences} connectFeed={connectFeed} />
            </CustomizationRuntime>
          </div>
          <FxDowngradeNotice />
        </FxProvider>
      </AnimationLevelProvider>
    </QueryClientProvider>
  );
}
