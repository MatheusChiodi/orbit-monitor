import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from 'zustand';
import { MonitorForm } from '@/domains/monitor/components/MonitorForm';
import { LoginForm } from '@/domains/security/LoginForm';
import { canEditMonitors, type SessionStore } from '@/domains/security/session';
import { GroupList } from '@/domains/workspace/GroupList';
import type { ApiClient } from '@/shared/api/client';
import type { MonitorDefinition, Session } from '@/shared/api/types';
import { Button } from '@/shared/ui';
import { DEMO_TOKEN, createConsoleSource, demoSession, type ConsoleApi } from './consoleSource';

export interface ConsoleAppProps {
  api: ConsoleApi & Pick<ApiClient, 'login'>;
  sessionStore: SessionStore;
  queryClient?: QueryClient;
}

function Workspace({ api, session, onSignOut }: { api: ConsoleApi; session: Session; onSignOut: () => void }) {
  const demo = session.token === DEMO_TOKEN;
  const source = useMemo(() => createConsoleSource(api, demo), [api, demo]);
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'new'>('list');
  const [notice, setNotice] = useState<string | null>(null);

  const groups = useQuery({ queryKey: ['groups', demo], queryFn: source.listGroups });
  const monitors = useQuery({ queryKey: ['monitors', demo], queryFn: source.listMonitors });
  const connections = useQuery({ queryKey: ['connections', demo], queryFn: source.listConnections, enabled: view === 'new' });

  const create = useMutation({
    mutationFn: source.createMonitor,
    onSuccess: async (_, definition: MonitorDefinition) => {
      await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
      setNotice(`Monitor "${definition.name}" salvo`);
      setView('list');
    },
  });

  const canEdit = canEditMonitors(session.user.role);
  const loadError = groups.isError || monitors.isError;

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-[1rem] border-b border-line px-[1.4rem] py-[0.7rem]">
        <span className="font-display text-[1.25rem] font-bold tracking-tight">Orbit</span>
        <span className="text-[0.85rem] text-muted">Console</span>
        {demo && <span className="text-[0.8rem] text-warn-text">dados de demonstração</span>}
        <nav className="ml-auto flex items-center gap-[0.8rem] text-[0.9rem]">
          <a href="/wall.html" className="text-info hover:underline">
            Abrir parede
          </a>
          <span className="text-muted">{session.user.name}</span>
          <Button variant="ghost" onClick={onSignOut}>
            Sair
          </Button>
        </nav>
      </header>

      <main className="mx-auto flex max-w-[80rem] flex-col gap-[1rem] p-[1.4rem]">
        {notice && (
          <p role="status" className="m-0 rounded-[0.45rem] border border-ok/50 bg-ok/12 px-[0.8rem] py-[0.5rem] text-ok-text">
            {notice}
          </p>
        )}
        {view === 'list' ? (
          <>
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">Monitores</h1>
            {loadError && <p className="m-0 text-down-text">Não foi possível carregar os monitores.</p>}
            {groups.isPending || monitors.isPending ? (
              <p className="m-0 text-muted">Carregando…</p>
            ) : (
              <GroupList
                groups={groups.data ?? []}
                monitors={monitors.data ?? []}
                canEdit={canEdit}
                onNewMonitor={() => {
                  setNotice(null);
                  setView('new');
                }}
              />
            )}
          </>
        ) : (
          <>
            <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">Novo monitor</h1>
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

/** Console de edição: login, lista de grupos/monitores e formulário de monitor. */
export function ConsoleApp({ api, sessionStore, queryClient }: ConsoleAppProps) {
  const [client] = useState(() => queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  const session = useStore(sessionStore, (s) => s.session);
  const { signIn, signOut } = sessionStore.getState();

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center p-[1.4rem]">
        <LoginForm onSubmit={async (credentials) => signIn(await api.login(credentials))} onDemo={() => signIn(demoSession())} />
      </main>
    );
  }

  return (
    <QueryClientProvider client={client}>
      <Workspace
        api={api}
        session={session}
        onSignOut={() => {
          client.clear();
          signOut();
        }}
      />
    </QueryClientProvider>
  );
}
