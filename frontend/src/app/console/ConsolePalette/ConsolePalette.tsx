import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { exportFileName } from '@/app/settings/configTransfer';
import { useToast } from '@/shared/ui';
import { CommandPalette, type PaletteItem } from '../CommandPalette';
import { useConsole, useGroups, useIncidents, useMonitors } from '../ConsoleContext';
import { NAV_SECTIONS } from '../ConsoleNav';
import { downloadBlob } from '../download';
import { SETTINGS_SECTIONS, type NavigateOptions, type RouteTarget } from '../routes';

export interface ConsolePaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewMonitor: () => void;
  onShowShortcuts: () => void;
  /** Customize mode (FE-53) for editors; absent for view-only clients. */
  onToggleCustomize?: () => void;
}

type Entry = PaletteItem & { run: () => void };

/**
 * FE-28 / FE-63 in the console: every function is one search away. Actions first (add, new, export),
 * then monitors, open incidents, per-item commands (edit, pause, run, delete, acknowledge, resolve),
 * pages and groups. Actions owned by a screen travel as `?action=` (the screen performs them; delete
 * only opens its confirmation); incident actions run here.
 */
export function ConsolePalette({ open, onOpenChange, onNewMonitor, onShowShortcuts, onToggleCustomize }: ConsolePaletteProps) {
  const { t } = useTranslation();
  const { access, navigate, source, demo } = useConsole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const monitors = useMonitors();
  const incidents = useIncidents();
  const go = (route: RouteTarget, options?: NavigateOptions) => () => navigate(route, options);
  const monitorName = (id: string) => monitors.data?.find((m) => m.id === id)?.name ?? id;
  const failed = (e: unknown) => toast({ title: t('screens.shell.actionFailed', { message: e instanceof Error ? e.message : String(e) }), tone: 'DOWN' });
  const incidentAction = (run: () => Promise<unknown>, done: string) => () =>
    void run()
      .then(() => {
        toast({ title: done, tone: 'OK' });
        return queryClient.invalidateQueries({ queryKey: ['incidents', demo] });
      })
      .catch(failed);
  const openIncidents = (incidents.data ?? []).filter((i) => i.status === 'OPEN');

  const entries: Entry[] = [
    { id: 'action:new-monitor', kind: 'action', label: t('screens.shell.addMonitor'), requiresEdit: true, run: onNewMonitor },
    { id: 'action:new-group', kind: 'action', label: t('screens.shell.newGroup'), requiresEdit: true, run: go({ name: 'monitors' }, { action: 'new-group' }) },
    { id: 'action:new-window', kind: 'action', label: t('screens.shell.newWindow'), requiresEdit: true, run: go({ name: 'maintenance' }, { action: 'new-window' }) },
    {
      id: 'action:new-status-page',
      kind: 'action',
      label: t('screens.shell.newStatusPage'),
      requiresEdit: true,
      run: go({ name: 'status-pages' }, { action: 'new-status-page' }),
    },
    {
      id: 'action:add-connection',
      kind: 'action',
      label: t('screens.shell.addConnection'),
      requiresEdit: true,
      run: go({ name: 'settings', section: 'connections' }, { action: 'add-connection' }),
    },
    {
      id: 'action:add-channel',
      kind: 'action',
      label: t('screens.shell.addChannel'),
      requiresEdit: true,
      run: go({ name: 'settings', section: 'notifications' }, { action: 'add-channel' }),
    },
    {
      id: 'action:export-config',
      kind: 'action',
      label: t('screens.shell.exportConfig'),
      requiresEdit: true,
      run: () =>
        void source
          .exportConfig()
          .then((blob) => {
            downloadBlob(blob, exportFileName());
            toast({ title: t('screens.shell.exported'), tone: 'OK' });
          })
          .catch(failed),
    },
    { id: 'action:open-wall', kind: 'action', label: t('console.openWall'), run: () => window.open('/wall.html', '_blank', 'noopener') },
    { id: 'action:shortcuts', kind: 'action', label: t('screens.shell.keyboardShortcuts'), run: onShowShortcuts },
    ...(onToggleCustomize
      ? [{ id: 'action:customize', kind: 'action' as const, label: t('screens.shell.customizeMode'), requiresEdit: true, run: onToggleCustomize }]
      : []),
    ...(monitors.data ?? []).flatMap((m): Entry[] => {
      const hint = groups.data?.find((g) => g.id === m.groupId)?.name;
      const monitor = { name: 'monitor', id: m.id } as const;
      const command = (id: string, label: string, run: () => void): Entry => ({
        id: `command:${id}:${m.id}`,
        kind: 'command',
        label,
        hint,
        requiresEdit: true,
        searchOnly: true,
        run,
      });
      return [
        { id: `monitor:${m.id}`, kind: 'monitor', label: m.name, hint, run: go(monitor) },
        command('edit', t('screens.shell.editMonitor', { name: m.name }), go({ name: 'edit-monitor', id: m.id })),
        command('pause', t('screens.shell.togglePause', { name: m.name }), go(monitor, { action: 'toggle-pause' })),
        command('run', t('screens.shell.runNow', { name: m.name }), go(monitor, { action: 'run' })),
        command('delete', t('screens.shell.deleteMonitor', { name: m.name }), go(monitor, { action: 'delete' })),
      ];
    }),
    ...openIncidents.map((i) => ({
      id: `incident:${i.id}`,
      kind: 'incident' as const,
      label: monitorName(i.monitorId),
      hint: i.severity === 'DOWN' || i.severity === 'WARN' ? t(`ui.status.${i.severity}`) : undefined,
      run: go({ name: 'incident', id: i.id }),
    })),
    ...openIncidents.flatMap((i): Entry[] => {
      const name = monitorName(i.monitorId);
      const ack: Entry[] = i.acknowledgedAt
        ? []
        : [
            {
              id: `command:ack:${i.id}`,
              kind: 'command',
              label: t('screens.shell.acknowledge', { name }),
              searchOnly: true,
              run: incidentAction(() => source.acknowledgeIncidentRecord(i.id), t('screens.shell.acknowledged')),
            },
          ];
      return [
        ...ack,
        {
          id: `command:resolve:${i.id}`,
          kind: 'command',
          label: t('screens.shell.resolve', { name }),
          requiresEdit: true,
          searchOnly: true,
          run: incidentAction(() => source.resolveIncident(i.id), t('screens.shell.resolved')),
        },
      ];
    }),
    ...NAV_SECTIONS.map((s) => ({ id: `page:${s.key}`, kind: 'page' as const, label: t(`screens.nav.${s.key}`), run: go(s.route) })),
    ...SETTINGS_SECTIONS.filter((s) => s !== 'general').map((section) => ({
      id: `page:settings-${section}`,
      kind: 'page' as const,
      label: t(`settingsHub.nav.${section}`),
      hint: t('screens.nav.settings'),
      run: go({ name: 'settings', section }),
    })),
    ...(groups.data ?? []).map((g) => ({ id: `group:${g.id}`, kind: 'group' as const, label: g.name, run: go({ name: 'monitors' }) })),
  ];

  return (
    <CommandPalette
      items={entries}
      mode={access.mode}
      open={open}
      onOpenChange={onOpenChange}
      onSelect={(item) => entries.find((e) => e.id === item.id)?.run()}
    />
  );
}
