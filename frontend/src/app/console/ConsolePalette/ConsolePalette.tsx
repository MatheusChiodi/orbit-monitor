import { useTranslation } from 'react-i18next';
import { CommandPalette, type PaletteItem } from '../CommandPalette';
import { useConsole, useGroups, useIncidents, useMonitors } from '../ConsoleContext';
import { NAV_SECTIONS } from '../ConsoleNav';
import { SETTINGS_SECTIONS, type RouteTarget } from '../routes';

export interface ConsolePaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewMonitor: () => void;
  onShowShortcuts: () => void;
  /** Customize mode (FE-53) for editors; absent for view-only clients. */
  onToggleCustomize?: () => void;
}

type Entry = PaletteItem & { run: () => void };

/** FE-28 / FE-63 in the console: monitors, open incidents, groups, every page and the shell actions. */
export function ConsolePalette({ open, onOpenChange, onNewMonitor, onShowShortcuts, onToggleCustomize }: ConsolePaletteProps) {
  const { t } = useTranslation();
  const { access, navigate } = useConsole();
  const groups = useGroups();
  const monitors = useMonitors();
  const incidents = useIncidents();
  const go = (route: RouteTarget) => () => navigate(route);
  const monitorName = (id: string) => monitors.data?.find((m) => m.id === id)?.name ?? id;

  const entries: Entry[] = [
    ...(monitors.data ?? []).map((m) => ({
      id: `monitor:${m.id}`,
      kind: 'monitor' as const,
      label: m.name,
      hint: groups.data?.find((g) => g.id === m.groupId)?.name,
      run: go({ name: 'monitor', id: m.id }),
    })),
    ...(incidents.data ?? [])
      .filter((i) => i.status === 'OPEN')
      .map((i) => ({
        id: `incident:${i.id}`,
        kind: 'incident' as const,
        label: monitorName(i.monitorId),
        hint: i.severity === 'DOWN' || i.severity === 'WARN' ? t(`ui.status.${i.severity}`) : undefined,
        run: go({ name: 'incident', id: i.id }),
      })),
    ...(groups.data ?? []).map((g) => ({ id: `group:${g.id}`, kind: 'group' as const, label: g.name, run: go({ name: 'monitors' }) })),
    ...NAV_SECTIONS.map((s) => ({ id: `page:${s.key}`, kind: 'page' as const, label: t(`screens.nav.${s.key}`), run: go(s.route) })),
    ...SETTINGS_SECTIONS.filter((s) => s !== 'general').map((section) => ({
      id: `page:settings-${section}`,
      kind: 'page' as const,
      label: t(`settingsHub.nav.${section}`),
      hint: t('screens.nav.settings'),
      run: go({ name: 'settings', section }),
    })),
    { id: 'action:new-monitor', kind: 'action', label: t('screens.shell.addMonitor'), requiresEdit: true, run: onNewMonitor },
    { id: 'action:open-wall', kind: 'action', label: t('console.openWall'), run: () => window.open('/wall.html', '_blank', 'noopener') },
    { id: 'action:shortcuts', kind: 'action', label: t('screens.shell.keyboardShortcuts'), run: onShowShortcuts },
    ...(onToggleCustomize
      ? [{ id: 'action:customize', kind: 'action' as const, label: t('screens.shell.customizeMode'), requiresEdit: true, run: onToggleCustomize }]
      : []),
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
