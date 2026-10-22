import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { MonitorForm } from '@/domains/monitor/components/MonitorForm';
import { canEdit } from '@/domains/security/access';
import type { OperatorStore } from '@/domains/security/operator';
import { OperatorPrompt } from '@/domains/security/OperatorPrompt';
import { ViewOnlyBanner } from '@/domains/security/ViewOnlyBanner';
import { CustomizationRuntime } from '@/domains/customization/CustomizationRuntime';
import { CustomizationScreen } from '@/domains/customization/CustomizationScreen';
import { CustomizeLayer } from '@/domains/customization/CustomizeLayer';
import { CustomizeModeProvider } from '@/domains/customization/CustomizeModeProvider';
import { CustomizeToggle } from '@/domains/customization/CustomizeToggle';
import { DevicePreferences } from '@/domains/workspace/DevicePreferences';
import { GroupList } from '@/domains/workspace/GroupList';
import { CommandPalette, type PaletteItem } from './CommandPalette';
import { DEFAULT_SHORTCUTS, ShortcutsHelp, useShortcuts } from './ShortcutsHelp';
import type { AccessInfo, MonitorDefinition } from '@/shared/api/types';
import { FxBackground } from '@/shared/fx/FxBackground';
import { FxDowngradeNotice } from '@/shared/fx/FxDowngradeNotice';
import { FxProvider } from '@/shared/fx/FxProvider';
import { LivingOrb } from '@/shared/fx/LivingOrb';
import { OrbitIntro } from '@/shared/fx/OrbitIntro';
import { LanguageSelector } from '@/shared/i18n/LanguageSelector';
import { AnimationLevelProvider } from '@/shared/motion/animationLevel';
import type { CustomizationApi } from '@/shared/customization/api';
import { createCustomizationStore, type CustomizationStore } from '@/shared/customization/store';
import { createTerminologyStore } from '@/shared/customization/terminology';
import { useAppearance } from '@/shared/customization/useAppearance';
import { createPreferencesStore, type PreferencesStore } from '@/shared/preferences/preferences';
import { Button } from '@/shared/ui';
import { usePreferenceEffects } from './usePreferenceEffects';
import { AppearancePage, APPEARANCE_HASH } from './AppearancePage';
import { ConsoleTheme } from './ConsoleTheme';
import { LayoutsPage, LAYOUTS_HASH } from './LayoutsPage';
import { createLayoutsApi, type LayoutsApi } from '@/domains/workspace/layout/layoutsApi';
import { createConfigClient } from '@/shared/api/configResources';
import { fetchWorkspaceDefaults, saveWorkspaceDefaults } from '@/shared/api/workspaceDefaults';
import type { WorkspacePreferenceDefaults } from '@/shared/preferences/preferences';
import type { ThemesClient } from '@/shared/theme/customThemes';
import { createConsoleSource, type ConsoleApi } from './consoleSource';

export interface ConsoleAppProps {
  api: ConsoleApi;
  operatorStore: OperatorStore;
  queryClient?: QueryClient;
  /** FE-50: device preferences; created from `localStorage` when omitted. */
  preferencesStore?: PreferencesStore;
  /** CORE-21: `orbit.customization.json` / `orbit.terminology.json` (BE-51); device-only when omitted. */
  customizationApi?: CustomizationApi;
  customizationStore?: CustomizationStore;
  /** FE-04: custom themes (`/api/themes`); created with the operator header when omitted. */
  configClient?: ThemesClient;
  /** FE-11: wall layouts (`/api/layouts`). */
  layoutsApi?: Pick<LayoutsApi, 'list' | 'save'>;
  /** BE-40: workspace defaults (`/api/settings/defaults`). */
  defaultsApi?: WorkspaceDefaultsApi;
}

export interface WorkspaceDefaultsApi {
  load: () => Promise<WorkspacePreferenceDefaults>;
  save: (defaults: WorkspacePreferenceDefaults) => Promise<WorkspacePreferenceDefaults>;
}

/** The startup language (`?lang=`, saved, browser) is never replaced by the workspace default. */
function withoutLocale({ locale: _locale, ...rest }: WorkspacePreferenceDefaults): WorkspacePreferenceDefaults {
  return rest;
}

/** `index.html#/settings/preferences` opens the device preferences screen. */
export const PREFERENCES_HASH = '#/settings/preferences';
/** `index.html#/settings/customization` opens the customization screen (CORE-21). */
export const CUSTOMIZATION_HASH = '#/settings/customization';
type ConsoleView = 'list' | 'new' | 'preferences' | 'customization' | 'appearance' | 'layouts';

function initialView(): ConsoleView {
  if (typeof window === 'undefined') return 'list';
  if (window.location.hash === PREFERENCES_HASH) return 'preferences';
  if (window.location.hash === APPEARANCE_HASH) return 'appearance';
  if (window.location.hash === LAYOUTS_HASH || window.location.hash.startsWith(`${LAYOUTS_HASH}/`)) return 'layouts';
  return window.location.hash === CUSTOMIZATION_HASH ? 'customization' : 'list';
}

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
  services: ConsoleServices;
}

interface ConsoleServices {
  themesClient: ThemesClient;
  layoutsApi: Pick<LayoutsApi, 'list' | 'save'>;
  defaultsApi: WorkspaceDefaultsApi;
}

function Workspace({ api, access, demo, operator, onChangeName, preferences, services }: WorkspaceProps) {
  const { t } = useTranslation();
  const source = useMemo(() => createConsoleSource(api, demo), [api, demo]);
  const queryClient = useQueryClient();
  const [view, setViewState] = useState<ConsoleView>(initialView);
  const setView = (next: ConsoleView) => {
    if (next === 'appearance') window.location.hash = APPEARANCE_HASH;
    else if (next === 'layouts') window.location.hash = LAYOUTS_HASH;
    setViewState(next);
  };
  const setWorkspaceTheme = (theme: string) =>
    void services.defaultsApi
      .save({ ...preferences.getState().defaults, theme })
      .then((saved) => preferences.getState().setWorkspaceDefaults(withoutLocale(saved)))
      .catch(() => {});
  const [notice, setNotice] = useState<string | null>(null);
  const editable = canEdit(access.mode);

  const groups = useQuery({ queryKey: ['groups', demo], queryFn: source.listGroups });
  const monitors = useQuery({ queryKey: ['monitors', demo], queryFn: source.listMonitors });
  const connections = useQuery({
    queryKey: ['connections', demo],
    queryFn: source.listConnections,
    enabled: view === 'new' && editable,
  });

  // `index.html#monitor-<id>` (wall card actions, FE-55): scroll to the row once the list is there.
  const monitorsLoaded = monitors.isSuccess;
  useEffect(() => {
    const target = /^#monitor-(.+)$/.exec(window.location.hash);
    if (monitorsLoaded && target) document.getElementById(`monitor-${decodeURIComponent(target[1]!)}`)?.scrollIntoView({ block: 'center' });
  }, [monitorsLoaded]);

  const openNew = () => {
    if (!editable) return;
    setNotice(null);
    setView('new');
  };
  useShortcuts({ 'monitor.new': openNew });

  const paletteItems: PaletteItem[] = [
    ...(monitors.data ?? []).map((m) => ({
      id: `monitor:${m.id}`,
      kind: 'monitor' as const,
      label: m.name,
      hint: groups.data?.find((g) => g.id === m.groupId)?.name,
    })),
    ...(groups.data ?? []).map((g) => ({ id: `group:${g.id}`, kind: 'group' as const, label: g.name })),
    { id: 'action:new-monitor', kind: 'action', label: t('console.monitors.new'), requiresEdit: true },
    { id: 'action:open-wall', kind: 'action', label: t('console.openWall') },
  ];

  function onPaletteSelect(item: PaletteItem) {
    if (item.id === 'action:new-monitor') openNew();
    else if (item.id === 'action:open-wall') window.location.assign('/wall.html');
    else setView('list');
  }

  const create = useMutation({
    mutationFn: source.createMonitor,
    onSuccess: async (_, definition: MonitorDefinition) => {
      await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
      setNotice(t('console.monitors.saved', { name: definition.name }));
      setView('list');
    },
  });

  return (
    <CustomizeModeProvider editable={editable}>
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-[1rem] border-b border-line px-[1.4rem] py-[0.7rem]">
        <span className="font-display text-[1.25rem] font-bold tracking-tight">{t('app.name')}</span>
        <span className="text-[0.85rem] text-muted">{t('app.console')}</span>
        {demo && <span className="text-[0.8rem] text-warn-text">{t('app.demoData')}</span>}
        <nav className="ml-auto flex flex-wrap items-center gap-[0.8rem] text-[0.9rem]">
          <LanguageSelector />
          <CustomizeToggle />
          <Button variant="ghost" aria-current={view === 'preferences' ? 'page' : undefined} onClick={() => setView('preferences')}>
            {t('preferences.title')}
          </Button>
          <Button variant="ghost" aria-current={view === 'customization' ? 'page' : undefined} onClick={() => setView('customization')}>
            {t('customization.title')}
          </Button>
          <Button variant="ghost" aria-current={view === 'appearance' ? 'page' : undefined} onClick={() => setView('appearance')}>
            {t('console.appearance')}
          </Button>
          <Button variant="ghost" aria-current={view === 'layouts' ? 'page' : undefined} onClick={() => setView('layouts')}>
            {t('console.layouts')}
          </Button>
          <a href="/wall.html" className="text-info hover:underline">
            {t('console.openWall')}
          </a>
          <span className="text-muted">{operator}</span>
          <Button variant="ghost" onClick={onChangeName}>
            {t('operator.change')}
          </Button>
        </nav>
      </header>

      <CommandPalette items={paletteItems} mode={access.mode} onSelect={onPaletteSelect} />
      <ShortcutsHelp shortcuts={DEFAULT_SHORTCUTS} />
      <main className="mx-auto flex max-w-[80rem] flex-col gap-[1rem] p-[1.4rem]">
        <ViewOnlyBanner mode={access.mode} />
        {notice && (
          <p className="m-0 rounded-[0.45rem] border border-ok/50 bg-ok/12 px-[0.8rem] py-[0.5rem] text-ok-text">{notice}</p>
        )}
        {view === 'appearance' ? (
          <>
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{t('console.appearance')}</h1>
            <AppearancePage themesClient={services.themesClient} editable={editable} onSetWorkspaceDefault={setWorkspaceTheme} />
          </>
        ) : view === 'layouts' ? (
          <>
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{t('console.layouts')}</h1>
            <LayoutsPage api={services.layoutsApi} editable={editable} monitors={monitors.data ?? []} groups={groups.data ?? []} />
          </>
        ) : view === 'customization' ? (
          <>
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{t('customization.title')}</h1>
            <CustomizationScreen editable={editable} />
          </>
        ) : view === 'preferences' ? (
          <>
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{t('preferences.title')}</h1>
            <DevicePreferences store={preferences} />
          </>
        ) : view === 'list' || !editable ? (
          <>
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{t('console.monitors.title')}</h1>
            {(groups.isError || monitors.isError) && <p className="m-0 text-down-text">{t('console.monitors.loadError')}</p>}
            {groups.isPending || monitors.isPending ? (
              <p className="m-0 text-muted">{t('app.loading')}</p>
            ) : (
              <>
                {(monitors.data ?? []).length === 0 ? (
                  <div className="grid gap-[1rem] md:grid-cols-2">
                    <OrbitIntro id="first-monitor" tilt />
                    <OrbitIntro id="check-flow" tilt />
                  </div>
                ) : (
                  <LivingOrb
                    interactive
                    monitors={monitors.data ?? []}
                    groups={groups.data ?? []}
                    className="h-[19rem] w-full"
                    onOpen={(id) => document.getElementById(`monitor-${id}`)?.scrollIntoView({ block: 'center' })}
                  />
                )}
                <GroupList
                groups={groups.data ?? []}
                monitors={monitors.data ?? []}
                canEdit={editable}
                onNewMonitor={() => {
                  setNotice(null);
                  setView('new');
                }}
              />
              </>
            )}
          </>
        ) : (
          <>
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{t('console.monitors.newTitle')}</h1>
            <MonitorForm
              groups={groups.data ?? []}
              connections={connections.data ?? []}
              onPreview={source.previewMonitor}
              onSave={async (definition) => {
                await create.mutateAsync(definition);
              }}
              onCancel={() => setView('list')}
            />
          </>
        )}
      </main>
      <CustomizeLayer />
    </div>
    </CustomizeModeProvider>
  );
}

interface ShellProps {
  api: ConsoleApi;
  operatorStore: OperatorStore;
  preferences: PreferencesStore;
  services: ConsoleServices;
}

function Shell({ api, operatorStore, preferences, services }: ShellProps) {
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
  customizationApi,
  customizationStore,
  configClient,
  layoutsApi,
  defaultsApi,
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
      defaultsApi: defaultsApi ?? { load: () => fetchWorkspaceDefaults(), save: (d) => saveWorkspaceDefaults(d, { getOperator }) },
    };
  });
  // BE-40: workspace defaults fill whatever this device did not choose (FE-50).
  useEffect(() => {
    let current = true;
    services.defaultsApi
      .load()
      .then((defaults) => current && preferences.getState().setWorkspaceDefaults(withoutLocale(defaults)))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [services, preferences]);
  const effective = usePreferenceEffects(preferences, operatorStore);
  useAppearance(customization);
  return (
    <QueryClientProvider client={client}>
      <AnimationLevelProvider level={effective.animation}>
        <ConsoleTheme preferences={preferences} themesClient={services.themesClient}>
        <FxProvider>
          <FxBackground />
          <div className="fx-layer">
            <CustomizationRuntime store={customization} terminology={terminology}>
              <Shell api={api} operatorStore={operatorStore} preferences={preferences} services={services} />
            </CustomizationRuntime>
          </div>
          <FxDowngradeNotice />
        </FxProvider>
        </ConsoleTheme>
      </AnimationLevelProvider>
    </QueryClientProvider>
  );
}
