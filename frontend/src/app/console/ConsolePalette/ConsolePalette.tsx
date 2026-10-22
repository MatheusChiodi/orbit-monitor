import { useTranslation } from 'react-i18next';
import { CommandPalette, type PaletteItem } from '../CommandPalette';
import { useConsole, useGroups, useMonitors } from '../ConsoleContext';
import type { ConsoleRoute } from '../routes';

const SECTIONS = [
  ['incidents', 'incidents'],
  ['maintenance', 'maintenance'],
  ['dependencies', 'dependencies'],
  ['reports', 'reports'],
  ['status-pages', 'statusPages'],
  ['audit', 'audit'],
  ['settings', 'settings'],
] as const;

export interface ConsolePaletteProps {
  onNewMonitor: () => void;
  onNavigate: (route: ConsoleRoute) => void;
}

/** FE-28 in the console: monitors, groups, sections and actions. */
export function ConsolePalette({ onNewMonitor, onNavigate }: ConsolePaletteProps) {
  const { t } = useTranslation();
  const { access } = useConsole();
  const groups = useGroups();
  const monitors = useMonitors();

  const items: PaletteItem[] = [
    ...(monitors.data ?? []).map((m) => ({
      id: `monitor:${m.id}`,
      kind: 'monitor' as const,
      label: m.name,
      hint: groups.data?.find((g) => g.id === m.groupId)?.name,
    })),
    ...(groups.data ?? []).map((g) => ({ id: `group:${g.id}`, kind: 'group' as const, label: g.name })),
    { id: 'action:new-monitor', kind: 'action', label: t('console.monitors.new'), requiresEdit: true },
    { id: 'action:open-wall', kind: 'action', label: t('console.openWall') },
    ...SECTIONS.map(([name, label]) => ({ id: `section:${name}`, kind: 'action' as const, label: t(`screens.nav.${label}`) })),
  ];

  function onSelect(item: PaletteItem) {
    if (item.id === 'action:new-monitor') return onNewMonitor();
    if (item.id === 'action:open-wall') return window.location.assign('/wall.html');
    const section = SECTIONS.find(([name]) => item.id === `section:${name}`);
    if (section) return onNavigate({ name: section[0] });
    onNavigate({ name: 'monitors' });
  }

  return <CommandPalette items={items} mode={access.mode} onSelect={onSelect} />;
}
