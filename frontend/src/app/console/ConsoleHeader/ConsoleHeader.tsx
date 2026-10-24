import { useTranslation } from 'react-i18next';
import { IconButton, IconMenu, IconSearch } from '@/shared/ui';
import { currentSection } from '../ConsoleNav';
import { NotificationsBell, type IncidentFeedConnector } from '../NotificationsBell';
import { currentPlatform } from '../ShortcutsHelp';
import type { ConsoleRoute } from '../routes';

export interface ConsoleHeaderProps {
  route: ConsoleRoute;
  connectFeed?: IncidentFeedConnector;
  onOpenMenu: () => void;
  onOpenPalette: () => void;
}

/**
 * FE-63 top bar: menu button and section name (mobile), "Search or jump…" (opens the command palette)
 * and the notification bell. Settings, language and appearance live in Settings, not here.
 */
export function ConsoleHeader({ route, connectFeed, onOpenMenu, onOpenPalette }: ConsoleHeaderProps) {
  const { t } = useTranslation();
  const section = currentSection(route);
  const hotkey = currentPlatform() === 'mac' ? '⌘K' : 'Ctrl K';
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-bg px-2 sm:px-4 lg:px-6">
      <IconButton label={t('screens.shell.openMenu')} icon={IconMenu} onClick={onOpenMenu} className="lg:hidden" />
      <p className="m-0 min-w-0 flex-1 truncate text-base font-medium text-text lg:hidden">
        {section ? t(`screens.nav.${section.key}`) : t('app.name')}
      </p>
      <button
        type="button"
        onClick={onOpenPalette}
        aria-keyshortcuts="Control+K Meta+K"
        aria-label={t('screens.shell.search')}
        className="ui-control hidden h-9 w-full max-w-sm items-center gap-2 rounded-sm border border-line bg-s1 px-3 text-base text-dim transition-colors duration-120 hover:border-line-2 hover:text-muted sm:flex"
      >
        <IconSearch size={16} />
        <span className="flex-1 text-left">{t('screens.shell.search')}</span>
        <kbd aria-hidden className="rounded-sm border border-line-2 bg-s2 px-1.5 font-mono text-xs text-muted">
          {hotkey}
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <IconButton label={t('screens.shell.search')} icon={IconSearch} onClick={onOpenPalette} className="sm:hidden" />
        <NotificationsBell connect={connectFeed} />
      </div>
    </header>
  );
}
