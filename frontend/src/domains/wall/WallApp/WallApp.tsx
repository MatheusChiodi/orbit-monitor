import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import type { ApiClient } from '@/shared/api/client';
import type { WallSnapshot } from '@/shared/api/types';
import { connectWall, wallSocketUrl, type ConnectWallOptions, type WallConnection } from '@/shared/api/wallSocket';
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
  /** Token de parede (somente leitura), repassado ao WebSocket. */
  token?: string;
}

/** Nome mostrado em "X reconheceu às HH:MM": `?operador=` na URL ou o último usado. */
export function operatorName(search: string, saved: string | null): string {
  const fromUrl = new URLSearchParams(search).get('operador');
  return fromUrl?.trim() || saved?.trim() || 'Operador';
}

function requestFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

export function WallApp({ api, connect = connectWall, operator, mock, token }: WallAppProps) {
  const [store] = useState(() => createWallStore());
  const snapshot = useStore(store, (s) => s.snapshot);
  const connection = useStore(store, (s) => s.connection);
  const freshEventIds = useStore(store, (s) => s.freshEventIds);
  const now = useNow(1000);

  useEffect(() => {
    let stopped = false;
    let stop: (() => void) | undefined;
    void startWallFeed(store, {
      loadSnapshot: api.getWallSnapshot,
      connect,
      url: wallSocketUrl(window.location, token),
      mock,
    }).then((feed) => {
      if (stopped) feed.stop();
      else stop = feed.stop;
    });
    return () => {
      stopped = true;
      stop?.();
    };
  }, [store, api, connect, mock, token]);

  const onAcknowledge = useCallback(
    (incidentId: string) => void acknowledge(store, incidentId, operator, api.acknowledgeIncident),
    [store, operator, api],
  );

  return (
    <MotionProvider>
      <WallScreen
        snapshot={snapshot}
        now={now}
        connection={connection}
        freshEventIds={freshEventIds}
        onAcknowledge={onAcknowledge}
        onFullscreen={requestFullscreen}
      />
    </MotionProvider>
  );
}
