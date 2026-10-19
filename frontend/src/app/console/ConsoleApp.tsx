import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { MonitorForm } from '@/domains/monitor/components/MonitorForm';
import { canEdit } from '@/domains/security/access';
import type { OperatorStore } from '@/domains/security/operator';
import { OperatorPrompt } from '@/domains/security/OperatorPrompt';
import { ViewOnlyBanner } from '@/domains/security/ViewOnlyBanner';
import { GroupList } from '@/domains/workspace/GroupList';
import { CommandPalette, type PaletteItem } from './CommandPalette';
import { DEFAULT_SHORTCUTS, ShortcutsHelp, useShortcuts } from './ShortcutsHelp';
import type { AccessInfo, MonitorDefinition } from '@/shared/api/types';
import { FxBackground } from '@/shared/fx/FxBackground';
import { FxDowngradeNotice } from '@/shared/fx/FxDowngradeNotice';
import { FxProvider } from '@/shared/fx/FxProvider';
import { OrbitIntro } from '@/shared/fx/OrbitIntro';
import { LanguageSelector } from '@/shared/i18n/LanguageSelector';
import { Button } from '@/shared/ui';
import { createConsoleSource, type ConsoleApi } from './consoleSource';

export interface ConsoleAppProps {
  api: ConsoleApi;
  operatorStore: OperatorStore;
  queryClient?: QueryClient;
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
}

function Workspace({ api, access, demo, operator, onChangeName }: WorkspaceProps) {
  const { t } = useTranslation();
  const source = useMemo(() => createConsoleSource(api, demo), [api, demo]);
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'new'>('list');
  const [notice, setNotice] = useState<string | null>(null);
  const editable = canEdit(access.mode);

  const groups = useQuery({ queryKey: ['groups', demo], queryFn: source.listGroups });
  const monitors = useQuery({ queryKey: ['monitors', demo], queryFn: source.listMonitors });
  const connections = useQuery({
    queryKey: ['connections', demo],
    queryFn: source.listConnections,
    enabled: view === 'new' && editable,
  });

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
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-[1rem] border-b border-line px-[1.4rem] py-[0.7rem]">
        <span className="font-display text-[1.25rem] font-bold tracking-tight">{t('app.name')}</span>
        <span className="text-[0.85rem] text-muted">{t('app.console')}</span>
        {demo && <span className="text-[0.8rem] text-warn-text">{t('app.demoData')}</span>}
        <nav className="ml-auto flex flex-wrap items-center gap-[0.8rem] text-[0.9rem]">
          <LanguageSelector />
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
        {view === 'list' || !editable ? (
          <>
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{t('console.monitors.title')}</h1>
            {(groups.isError || monitors.isError) && <p className="m-0 text-down-text">{t('console.monitors.loadError')}</p>}
            {groups.isPending || monitors.isPending ? (
              <p className="m-0 text-muted">{t('app.loading')}</p>
            ) : (
              <>
                {(monitors.data ?? []).length === 0 && (
                  <div className="grid gap-[1rem] md:grid-cols-2">
                    <OrbitIntro id="first-monitor" tilt />
                    <OrbitIntro id="check-flow" tilt />
                  </div>
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
    </div>
  );
}

function Shell({ api, operatorStore }: Omit<ConsoleAppProps, 'queryClient'>) {
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
    />
  );
}

/** Console: no login; the operator declares a name once and the API decides edit vs. view-only. */
export function ConsoleApp({ api, operatorStore, queryClient }: ConsoleAppProps) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <FxProvider>
        <FxBackground />
        <div className="fx-layer">
          <Shell api={api} operatorStore={operatorStore} />
        </div>
        <FxDowngradeNotice />
      </FxProvider>
    </QueryClientProvider>
  );
}
