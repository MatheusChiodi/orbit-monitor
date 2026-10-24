import { useTranslation } from 'react-i18next';
import { IconExternal, IconWall } from '@/shared/ui';
import { routeHref, type ConsoleRoute } from '../routes';
import { NAV_SECTIONS, type NavGroup, type NavSection } from './navSections';

export interface ConsoleNavProps {
  route: ConsoleRoute;
  /** Open incidents, shown as a count next to Incidents (0 hides it). */
  openIncidents: number;
}

const LINK = 'ui-control flex h-9 items-center gap-3 rounded-sm px-3 text-base transition-colors duration-120';

function NavLink({ section, route, count }: { section: NavSection; route: ConsoleRoute; count: number }) {
  const { t } = useTranslation();
  const current = section.active.includes(route.name);
  const Icon = section.icon;
  return (
    <li>
      <a
        href={routeHref(section.route)}
        aria-current={current ? 'page' : undefined}
        className={`${LINK} ${current ? 'bg-s3 font-medium text-text' : 'text-muted hover:bg-s2 hover:text-text'}`}
      >
        <Icon size={16} className={current ? 'text-accent' : ''} />
        <span className="min-w-0 flex-1 truncate">{t(`screens.nav.${section.key}`)}</span>
        {count > 0 && (
          <span className="rounded-full bg-down/15 px-2 font-mono text-xs leading-5 font-medium text-down-text">
            <span aria-hidden>{count}</span>
            <span className="sr-only">, {t('screens.shell.openIncidents', { count })}</span>
          </span>
        )}
      </a>
    </li>
  );
}

/** FE-63: the console sections (sidebar on desktop, drawer on mobile) and the wall link. */
export function ConsoleNav({ route, openIncidents }: ConsoleNavProps) {
  const { t } = useTranslation();
  const group = (name: NavGroup) =>
    NAV_SECTIONS.filter((s) => s.group === name).map((section) => (
      <NavLink key={section.key} section={section} route={route} count={section.key === 'incidents' ? openIncidents : 0} />
    ));
  return (
    <nav aria-label={t('screens.nav.label')} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">{group('primary')}</ul>
      <div className="flex flex-col gap-1">
        <p className="section-label m-0 px-3">{t('screens.shell.more')}</p>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">{group('more')}</ul>
      </div>
      <ul className="m-0 mt-auto flex list-none flex-col gap-0.5 border-t border-line p-0 pt-3">
        {group('footer')}
        <li>
          <a href="/wall.html" target="_blank" rel="noopener" className={`${LINK} text-muted hover:bg-s2 hover:text-text`}>
            <IconWall size={16} />
            <span className="min-w-0 flex-1">{t('console.openWall')}</span>
            <IconExternal size={16} className="text-dim" />
            <span className="sr-only"> {t('screens.shell.newTab')}</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
