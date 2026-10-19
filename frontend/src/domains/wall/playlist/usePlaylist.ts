import { useEffect, useRef, useState } from 'react';
import { nextPlaylistState, type Playlist, type PlaylistState } from './playlist';

/** Ticks the playlist once per second; an unacknowledged incident holds the current layout. */
export function usePlaylist(playlist: Playlist, options: { unacknowledgedIncident: boolean }): PlaylistState {
  const unack = useRef(options.unacknowledgedIncident);
  unack.current = options.unacknowledgedIncident;
  const [state, setState] = useState(() =>
    nextPlaylistState(playlist, null, { elapsedSeconds: 0, unacknowledgedIncident: options.unacknowledgedIncident }),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setState((current) => nextPlaylistState(playlist, current, { elapsedSeconds: 1, unacknowledgedIncident: unack.current }));
    }, 1000);
    return () => clearInterval(timer);
  }, [playlist]);

  return state;
}
