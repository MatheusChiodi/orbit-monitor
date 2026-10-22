import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/shared/i18n/LanguageSelector';
import { Button } from '@/shared/ui';
import { useConsole } from '../ConsoleContext';
import { NotificationsBell, type IncidentFeedConnector } from '../NotificationsBell';
import { routeHref, type ConsoleRoute, type ConsoleRouteName } from '../routes';

const SECTIONS = [
  { route: { name: 'monitors' }, label: 'monitors', active: ['monitors', 'new-monitor'] },
  { route: { name: 'incidents' }, label: 'incidents', active: ['incidents', 'incident'] },
  { route: { name: 'maintenance' }, label: 'maintenance', active: ['maintenance'] },
  { route: { name: 'dependencies' }, label: 'dependencies', active: ['dependencies'] },
  { route: { name: 'reports' }, label: 'reports', active: ['reports'] },
  { route: { name: 'status-pages' }, label: 'statusPages', active: ['status-pages'] },
  { route: { name: 'audit' }, label: 'audit', active: ['audit'] },
  { route: { name: 'settings' }, label: 'settings', active: ['settings'] },
] as const satisfies readonly { route: ConsoleRoute; label: string; active: readonly ConsoleRouteName[] }[];

export interface ConsoleHeaderProps {
  route: ConsoleRoute;
  onChangeName: () => void;
  connectFeed?: IncidentFeedConnector;
}

/** Console header: sections, notification bell (FE-38), language, device preferences, wall link and operator. */
export function ConsoleHeader({ route, onChangeName, connectFeed }: ConsoleHeaderProps) {
  const { t } = useTranslation();
  const { demo, operator, navigate } = useConsole();
  return (
    <header className="flex flex-col gap-[0.5rem] border-b border-line px-[1.4rem] py-[0.7rem]">
      <div className="flex flex-wrap items-center gap-[1rem]">
        <span className="font-display text-[1.25rem] font-bold tracking-tight">{t('app.name')}</span>
        <span className="text-[0.85rem] text-muted">{t('app.console')}</span>
        {demo && <span className="text-[0.8rem] text-warn-text">{t('app.demoData')}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-[0.8rem] text-[0.9rem]">
          <NotificationsBell connect={connectFeed} />
          <LanguageSelector />
          <Button
            variant="ghost"
            aria-current={route.name === 'preferences' ? 'page' : undefined}
            onClick={() => navigate({ name: 'preferences' })}
          >
            {t('preferences.title')}
          </Button>
          <a href="/wall.html" className="text-info hover:underline">
            {t('console.openWall')}
          </a>
          <span className="text-muted">{operator}</span>
          <Button variant="ghost" onClick={onChangeName}>
            {t('operator.change')}
          </Button>
        </div>
      </div>
      <nav aria-label={t('screens.nav.label')} className="-mx-[0.3rem] flex flex-wrap gap-[0.2rem] text-[0.88rem]">
        {SECTIONS.map((section) => {
          const current = (section.active as readonly ConsoleRouteName[]).includes(route.name);
          return (
            <a
              key={section.label}
              href={routeHref(section.route)}
              aria-current={current ? 'page' : undefined}
              className={`rounded-[0.45rem] px-[0.6rem] py-[0.3rem] transition-colors duration-[120ms] ${current ? 'bg-info/12 font-semibold text-info' : 'text-muted hover:bg-s2 hover:text-text'}`}
            >
              {t(`screens.nav.${section.label}`)}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
