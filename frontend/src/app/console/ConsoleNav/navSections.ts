import { IconAlert, IconMonitor, IconSettings, type IconComponent } from '@/shared/ui';
import type { ConsoleRoute, ConsoleRouteName } from '../routes';
import { IconAudit, IconDependencies, IconMaintenance, IconReports, IconStatusPages } from './navIcons';

export type NavGroup = 'primary' | 'more' | 'footer';

export interface NavSection {
  key: 'monitors' | 'incidents' | 'maintenance' | 'reports' | 'statusPages' | 'dependencies' | 'audit' | 'settings';
  route: ConsoleRoute;
  /** Routes that mark this section as the current page. */
  active: readonly ConsoleRouteName[];
  icon: IconComponent;
  group: NavGroup;
}

/** FE-63 information architecture: four primary sections, "More", then Settings at the bottom. */
export const NAV_SECTIONS: readonly NavSection[] = [
  { key: 'monitors', route: { name: 'monitors' }, active: ['monitors', 'new-monitor', 'monitor', 'edit-monitor'], icon: IconMonitor, group: 'primary' },
  { key: 'incidents', route: { name: 'incidents' }, active: ['incidents', 'incident'], icon: IconAlert, group: 'primary' },
  { key: 'maintenance', route: { name: 'maintenance' }, active: ['maintenance'], icon: IconMaintenance, group: 'primary' },
  { key: 'reports', route: { name: 'reports' }, active: ['reports'], icon: IconReports, group: 'primary' },
  { key: 'statusPages', route: { name: 'status-pages' }, active: ['status-pages'], icon: IconStatusPages, group: 'more' },
  { key: 'dependencies', route: { name: 'dependencies' }, active: ['dependencies'], icon: IconDependencies, group: 'more' },
  { key: 'audit', route: { name: 'audit' }, active: ['audit'], icon: IconAudit, group: 'more' },
  { key: 'settings', route: { name: 'settings', section: 'general' }, active: ['settings'], icon: IconSettings, group: 'footer' },
];

export function currentSection(route: ConsoleRoute): NavSection | undefined {
  return NAV_SECTIONS.find((section) => section.active.includes(route.name));
}
