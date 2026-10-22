import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useLocale } from '@/shared/i18n/useLocale';
import type { ApiClient } from '@/shared/api/client';
import type { WallSnapshot } from '@/shared/api/types';
import { connectWall, wallSocketUrl, type ConnectWallOptions, type WallConnection } from '@/shared/api/wallSocket';
import { FxBackground } from '@/shared/fx/FxBackground';
import { FxProvider } from '@/shared/fx/FxProvider';
import { hasUnacknowledgedDown } from '@/shared/fx/incident';
import { MotionProvider } from '@/shared/motion';
import { notifyIncident } from '@/domains/alerting/desktopNotifications';
import { useWallAlerts } from '../alerts';
import { OnCallView } from '../components/OnCallView';
import { WallControls } from '../components/WallControls';
import { NightModeOverlay, type NightSchedule } from '../display/nightMode';
import { useKiosk } from '../kiosk';
import { createSoundPlayer, loadSoundSettings, saveSoundSettings, type SoundSettings } from '../sound';
import { WallScreen } from '../components/WallScreen';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { acknowledge, startWallFeed } from '../feed';
import { useNow } from '../hooks';
import { createWallStore } from '../store';

export interface WallAppProps {
  api: Pick<ApiClient, 'getWallSnapshot' | 'acknowledgeIncident'>;
  connect?: (options: ConnectWallOptions) => WallConnection;
  operator: string;
  mock?: () => WallSnapshot;
  /** Wall layout slug (`/wall/noc`), sent to the WebSocket. */
  layout?: string;
  /** FE-45: fullscreen, Screen Wake Lock and hidden cursor (requested with ?kiosk=1). */
  kiosk?: boolean;
  /** FE-09: dims the wall between two local times (`?night=22:00-06:00`). */
  nightMode?: NightSchedule | null;
}

/** Name shown in "X acknowledged at HH:MM": `?operator=` in the URL or the last one used. */
export function operatorName(search: string, saved: string | null): string {
  const fromUrl = new URLSearchParams(search).get('operator');
  return fromUrl?.trim() || saved?.trim() || 'Operator';
}

function requestFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

export function WallApp({ api, connect = connectWall, operator, mock, layout, kiosk = false, nightMode = null }: WallAppProps) {
  const [store] = useState(() => createWallStore());
  const snapshot = useStore(store, (s) => s.snapshot);
  const connection = useStore(store, (s) => s.connection);
  const freshEventIds = useStore(store, (s) => s.freshEventIds);
  const lastUpdateAt = useStore(store, (s) => s.lastUpdateAt);
  const now = useNow(1000);
  const locale = useLocale();
  const [sound, setSound] = useState<SoundSettings>(loadSoundSettings);
  const [player] = useState(() => createSoundPlayer());
  const kioskMode = useKiosk();
  const { enter: enterKiosk } = kioskMode;

  useEffect(() => {
    if (kiosk) void enterKiosk();
  }, [kiosk, enterKiosk]);

  useWallAlerts(snapshot, { sound, player, notify: notifyIncident, locale });

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
    (incidentId: string) => void acknowledge(store, incidentId, operator, api.acknowledgeIncident, locale),
    [store, operator, api, locale],
  );

  const unownedIncident = snapshot ? hasUnacknowledgedDown(snapshot.incidents) : false;

  return (
    <MotionProvider>
      <FxProvider incidentActive={unownedIncident}>
        <FxBackground />
        <div className="fx-layer">
          {phone && snapshot ? (
            <OnCallView snapshot={snapshot} now={now} onAcknowledge={onAcknowledge} />
          ) : (
          <WallScreen
            snapshot={snapshot}
            now={now}
            connection={connection}
            freshEventIds={freshEventIds}
            updatedAt={lastUpdateAt}
            onAcknowledge={onAcknowledge}
            onFullscreen={requestFullscreen}
            controls={<WallControls sound={sound} onSoundChange={onSoundChange} />}
          />
          )}
        </div>
        {nightMode && <NightModeOverlay schedule={nightMode} now={now} hasUnownedIncident={unownedIncident} />}
      </FxProvider>
    </MotionProvider>
  );
}
