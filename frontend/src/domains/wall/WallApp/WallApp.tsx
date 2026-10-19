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
import { WallScreen } from '../components/WallScreen';
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

export function WallApp({ api, connect = connectWall, operator, mock, layout }: WallAppProps) {
  const [store] = useState(() => createWallStore());
  const snapshot = useStore(store, (s) => s.snapshot);
  const connection = useStore(store, (s) => s.connection);
  const freshEventIds = useStore(store, (s) => s.freshEventIds);
  const lastUpdateAt = useStore(store, (s) => s.lastUpdateAt);
  const now = useNow(1000);
  const locale = useLocale();

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

  const onAcknowledge = useCallback(
    (incidentId: string) => void acknowledge(store, incidentId, operator, api.acknowledgeIncident, locale),
    [store, operator, api, locale],
  );

  return (
    <MotionProvider>
      <FxProvider incidentActive={snapshot ? hasUnacknowledgedDown(snapshot.incidents) : false}>
        <FxBackground />
        <div className="fx-layer">
          <WallScreen
            snapshot={snapshot}
            now={now}
            connection={connection}
            freshEventIds={freshEventIds}
            updatedAt={lastUpdateAt}
            onAcknowledge={onAcknowledge}
            onFullscreen={requestFullscreen}
          />
        </div>
      </FxProvider>
    </MotionProvider>
  );
}
