import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useLocale } from '@/shared/i18n/useLocale';
import type { ApiCore } from '@/shared/api/client';
import type { WallSnapshot } from '@/shared/api/types';
import { connectWall, wallSocketUrl, type ConnectWallOptions, type WallConnection } from '@/shared/api/wallSocket';
import { FxBackground } from '@/shared/fx/FxBackground';
import { FxProvider } from '@/shared/fx/FxProvider';
import { hasUnacknowledgedDown } from '@/shared/fx/incident';
import { AnimationLevelProvider, systemPrefersReducedMotion } from '@/shared/motion/animationLevel';
import { fxLevelFor, parseMotionParam, resolveMotion } from '@/shared/motion/motionSettings';
import { MotionProvider } from '@/shared/motion/motion';
import { loadPreferences, type DeviceChoices } from '@/shared/preferences/preferences';
import { LazyThemeProvider } from '@/shared/theme/LazyThemeProvider';
import type { LoadEscalation } from '@/domains/alerting/escalation/escalationApi';
import type { LoadOnCall } from '@/domains/alerting/oncall/oncallApi';
import { TiledWall } from '../TiledWall';
import { useWallPresentation, type LoadLayout } from '../layout/useWallLayouts';
import { useWallSettings, type LoadCustomThemes, type LoadWorkspaceDefaults } from '../layout/useWallSettings';
import { parseTile } from '../tiling';
import type { LoadHistory } from '../components/SeriesBlock';
import type { AccessInfo, Incident, MonitorView } from '@/shared/api/types';
import type { Locale } from '@/shared/i18n/i18n';
import { useWallAlerts } from '../alerts';
import type { NightSchedule } from '../display/nightSchedule';
import { createSoundPlayer, loadSoundSettings, saveSoundSettings, type SoundSettings } from '../sound';
import { WallScreen } from '../components/WallScreen';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { acknowledge, startWallFeed } from '../feed';
import { useNow } from '../hooks';
import { createWallStore } from '../store';

export interface WallAppProps {
  api: Pick<ApiCore, 'getWallSnapshot' | 'acknowledgeIncident'>;
  connect?: (options: ConnectWallOptions) => WallConnection;
  mock?: () => WallSnapshot | Promise<WallSnapshot>;
  /** Wall layout slug (`/wall/noc`), sent to the WebSocket. */
  layout?: string;
  /** FE-45: fullscreen, Screen Wake Lock and hidden cursor (requested with ?kiosk=1). */
  kiosk?: boolean;
  /** FE-09: dims the wall between two local times (`?night=22:00-06:00`). */
  nightMode?: NightSchedule | null;
  /** Query string with the TV overrides `?theme=`, `?motion=` and `?tile=`; defaults to the page URL. */
  search?: string;
  /** FE-50 device choices; defaults to this browser's saved preferences. */
  device?: DeviceChoices;
  /** BE-41 `GET /api/layouts/{slug}`; without it the built-in NOC wall is shown. */
  loadLayout?: LoadLayout;
  /** BE-40 workspace defaults (`GET /api/settings/defaults`). */
  loadWorkspaceDefaults?: LoadWorkspaceDefaults;
  /** Custom themes (`GET /api/themes`). */
  loadCustomThemes?: LoadCustomThemes;
  loadEscalation?: LoadEscalation;
  loadOnCall?: LoadOnCall;
  loadHistory?: LoadHistory;
  /** CORE-12 access of this client; edit-only controls (desktop notifications) stay hidden until it says edit. */
  loadAccess?: () => Promise<AccessInfo>;
}

const NO_LAYOUT: LoadLayout = async () => null;

/** FE-48: the notification code loads with the first incident that needs it (wall budget). */
function notifyIncident(incident: Incident, monitor: MonitorView, locale: Locale): boolean {
  void import('@/domains/alerting/desktopNotifications/desktopNotifications').then((mod) => mod.notifyIncident(incident, monitor, locale));
  return true;
}

/** FE-09 overlay, loaded only when `?night=` is set (wall budget). */
const NightModeOverlay = lazy(() => import('../display/nightMode').then((mod) => ({ default: mod.NightModeOverlay })));

/** Header controls (sound, notifications, playlist status) render right after first paint (wall budget). */
const WallControls = lazy(() => import('../components/WallControls').then((mod) => ({ default: mod.WallControls })));

/** FE-45 kiosk code loads only with `?kiosk=1` (wall budget). */
const KioskMode = lazy(() => import('../kiosk/KioskMode'));

/** FE-49 phone view, loaded only on phones (wall budget). */
const OnCallView = lazy(() => import('../components/OnCallView').then((mod) => ({ default: mod.OnCallView })));

function useViewport(): { width: number; height: number } {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}


function requestFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

export function WallApp({
  api,
  connect = connectWall,
  mock,
  layout = 'noc',
  kiosk = false,
  nightMode = null,
  search = window.location.search,
  device: deviceProp,
  loadLayout = NO_LAYOUT,
  loadWorkspaceDefaults,
  loadCustomThemes,
  loadEscalation,
  loadOnCall,
  loadHistory,
  loadAccess,
}: WallAppProps) {
  const [device] = useState<DeviceChoices>(() => deviceProp ?? loadPreferences());
  const [store] = useState(() => createWallStore());
  const snapshot = useStore(store, (s) => s.snapshot);
  const connection = useStore(store, (s) => s.connection);
  const freshEventIds = useStore(store, (s) => s.freshEventIds);
  const lastUpdateAt = useStore(store, (s) => s.lastUpdateAt);
  const now = useNow(1000);
  const locale = useLocale();
  const [sound, setSound] = useState<SoundSettings>(loadSoundSettings);
  const [player] = useState(() => createSoundPlayer());


  useWallAlerts(snapshot, { sound, player, notify: notifyIncident, locale });

  // A TV is view-only (LAN) or kiosk: it gets no per-person controls such as desktop notifications.
  const [editable, setEditable] = useState(false);
  useEffect(() => {
    if (!loadAccess) return;
    let alive = true;
    loadAccess().then(
      (access) => alive && setEditable(access.mode === 'edit'),
      () => alive && setEditable(false),
    );
    return () => {
      alive = false;
    };
  }, [loadAccess]);

  const onSoundChange = useCallback((next: SoundSettings) => {
    setSound(next);
    saveSoundSettings(next);
  }, []);

  useEffect(() => {
    let stopped = false;
    let stop: (() => void) | undefined;
    void startWallFeed(store, {
      loadSnapshot: api.getWallSnapshot,
      connect,
      url: wallSocketUrl(window.location, layout),
      mock,
    }).then((feed) => {
      if (stopped) feed.stop();
      else stop = feed.stop;
    });
    return () => {
      stopped = true;
      stop?.();
    };
  }, [store, api, connect, mock, layout]);

  // FE-49: phones get the on-call view (hero, active incidents, full-width Acknowledge).
  const phone = useMediaQuery('(max-width: 639px)');

  const onAcknowledge = useCallback(
    (incidentId: string) => void acknowledge(store, incidentId, api.acknowledgeIncident, locale),
    [store, api, locale],
  );

  const unownedIncident = snapshot ? hasUnacknowledgedDown(snapshot.incidents) : false;
  const unacknowledged = snapshot ? snapshot.incidents.some((i) => !i.acknowledgedBy) : false;

  // FE-11 / FE-19: saved layout by slug, rotating through its playlist.
  const presentation = useWallPresentation({ load: loadLayout, slug: layout, unacknowledgedIncident: unacknowledged });
  const { defaults, customThemes } = useWallSettings(loadWorkspaceDefaults, loadCustomThemes);
  // FE-06: reduced motion → `?motion=` → layout override → device (preset + overrides) → workspace default.
  const motion = resolveMotion({
    reducedMotion: systemPrefersReducedMotion(),
    url: parseMotionParam(search),
    layout: presentation.animationLevel ? { level: presentation.animationLevel } : null,
    device: device.animation ? { level: device.animation, overrides: device.motion } : null,
    workspace: defaults.animation ? { level: defaults.animation } : null,
  });
  const animated = motion.level !== 'off';

  // FE-20: `?tile=n/2|n/4`, one browser per screen of a video wall.
  const tile = parseTile(search);
  const viewport = useViewport();
  const tileRows = tile?.rows ?? null;
  useEffect(() => {
    if (tileRows === null) return;
    const html = document.documentElement;
    html.style.setProperty('--wall-tile-factor', String(tileRows));
    return () => {
      html.style.removeProperty('--wall-tile-factor');
    };
  }, [tileRows]);

  const screen = (
    <WallScreen
      snapshot={presentation.ready ? snapshot : null}
      now={now}
      connection={connection}
      freshEventIds={freshEventIds}
      updatedAt={lastUpdateAt}
      onAcknowledge={onAcknowledge}
      onFullscreen={requestFullscreen}
      controls={
        <Suspense fallback={null}>
          <WallControls sound={sound} onSoundChange={onSoundChange} playlist={presentation.playlist} notifications={editable && !kiosk} />
        </Suspense>
      }
      blocks={presentation.blocks}
      layoutKey={presentation.slug}
      loadEscalation={loadEscalation}
      loadOnCall={loadOnCall}
      loadHistory={loadHistory}
    />
  );

  return (
    <AnimationLevelProvider level={motion.level} settings={motion.settings}>
    <LazyThemeProvider
      search={search}
      layoutThemeId={presentation.themeId}
      deviceThemeId={device.theme ?? null}
      workspaceThemeId={defaults.theme ?? null}
      customThemes={customThemes}
      animate={animated}
    >
    <MotionProvider>
      <FxProvider level={fxLevelFor(motion.settings, motion.level)} incidentActive={unownedIncident}>
        <FxBackground />
        <div className="fx-layer">
          {phone && snapshot ? (
            <Suspense fallback={null}>
              <OnCallView snapshot={snapshot} now={now} onAcknowledge={onAcknowledge} />
            </Suspense>
          ) : tile ? (
            <TiledWall tile={tile} canvas={{ width: viewport.width * tile.columns, height: viewport.height * tile.rows }}>
              {screen}
            </TiledWall>
          ) : (
            screen
          )}
        </div>
        {kiosk && (
          <Suspense fallback={null}>
            <KioskMode />
          </Suspense>
        )}
        {nightMode && (
          <Suspense fallback={null}>
            <NightModeOverlay schedule={nightMode} now={now} hasUnownedIncident={unownedIncident} />
          </Suspense>
        )}
      </FxProvider>
    </MotionProvider>
    </LazyThemeProvider>
    </AnimationLevelProvider>
  );
}
