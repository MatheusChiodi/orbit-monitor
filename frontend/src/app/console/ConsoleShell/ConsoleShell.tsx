import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ViewOnlyBanner } from '@/domains/security/ViewOnlyBanner';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { ToastViewport } from '@/shared/ui';
import { useConsole, useIncidents } from '../ConsoleContext';
import { ConsoleHeader } from '../ConsoleHeader';
import { ConsoleNav } from '../ConsoleNav';
import { ConsolePalette } from '../ConsolePalette';
import { DemoBanner } from '../DemoBanner';
import { NavDrawer } from '../NavDrawer';
import type { IncidentFeedConnector } from '../NotificationsBell';
import { routeHref, type ConsoleRoute } from '../routes';
import { DEFAULT_SHORTCUTS, ShortcutsHelp, useShortcuts } from '../ShortcutsHelp';

export interface ConsoleShellProps {
  route: ConsoleRoute;
  connectFeed?: IncidentFeedConnector;
  onNewMonitor: () => void;
  children: ReactNode;
}

/**
 * FE-63 console shell: sidebar (≥ 1024 px) or drawer, slim top bar, demo / view-only notices, the
 * command palette, the shortcut sheet and the one toast viewport.
 */
export function ConsoleShell({ route, connectFeed, onNewMonitor, children }: ConsoleShellProps) {
  const { t } = useTranslation();
  const { access, demo, editable } = useConsole();
  const incidents = useIncidents();
  // FE-53 Customize mode (editors only); its `Ctrl+.` shortcut lives in CustomizeLayer.
  const { mode } = useCustomization();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const openIncidents = (incidents.data ?? []).filter((i) => i.status === 'OPEN').length;
  const href = routeHref(route);

  useShortcuts({ 'monitor.new': onNewMonitor });
  // A followed link closes the drawer.
  useEffect(() => setMenuOpen(false), [href]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only z-60 rounded-sm bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('screens.shell.skip')}
      </a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-58 flex-col border-r border-line bg-s1 lg:flex">
        <a href={routeHref({ name: 'monitors' })} className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-6">
          <span aria-hidden className="size-2.5 rounded-full border-2 border-accent" />
          <span className="display-wide text-md text-text">{t('app.name')}</span>
          <span className="text-sm text-dim">{t('app.console')}</span>
        </a>
        <ConsoleNav route={route} openIncidents={openIncidents} onAddMonitor={editable ? onNewMonitor : undefined} />
      </aside>
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)}>
        <ConsoleNav route={route} openIncidents={openIncidents} onAddMonitor={editable ? onNewMonitor : undefined} />
      </NavDrawer>
      <div className="flex min-h-screen flex-col lg:pl-58">
        <ConsoleHeader
          route={route}
          connectFeed={connectFeed}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        {demo && <DemoBanner />}
        <main id="main" tabIndex={-1} className="flex w-full max-w-300 flex-1 flex-col gap-4 px-4 py-6 focus:outline-none lg:px-6 lg:py-8">
          <ViewOnlyBanner mode={access.mode} />
          {children}
        </main>
      </div>
      <ConsolePalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNewMonitor={onNewMonitor}
        onShowShortcuts={() => setHelpOpen(true)}
        onToggleCustomize={mode ? () => mode.getState().toggle() : undefined}
      />
      <ShortcutsHelp shortcuts={DEFAULT_SHORTCUTS} open={helpOpen} onOpenChange={setHelpOpen} />
      <ToastViewport />
    </div>
  );
}
