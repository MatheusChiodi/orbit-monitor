import { useEffect, useRef, useState } from 'react';
import { nextPlaylistState, type Playlist, type PlaylistState } from './playlist';

interface Tracked {
  playlist: Playlist;
  value: PlaylistState;
}

/**
 * Ticks the playlist once per second; an unacknowledged incident holds the current layout.
 * A new playlist (e.g. once the layout has loaded) starts again from its first entry; a playlist
 * with fewer than two entries starts no timer.
 */
export function usePlaylist(playlist: Playlist, options: { unacknowledgedIncident: boolean }): PlaylistState {
  const unack = useRef(options.unacknowledgedIncident);
  unack.current = options.unacknowledgedIncident;
  const start = (p: Playlist): Tracked => ({
    playlist: p,
    value: nextPlaylistState(p, null, { elapsedSeconds: 0, unacknowledgedIncident: options.unacknowledgedIncident }),
  });
  const [tracked, setTracked] = useState<Tracked>(() => start(playlist));
  const current = tracked.playlist === playlist ? tracked : start(playlist);
  if (current !== tracked) setTracked(current);

  const rotates = playlist.entries.length > 1;
  useEffect(() => {
    if (!rotates) return;
    const timer = setInterval(() => {
      setTracked((t) =>
        t.playlist === playlist
          ? { playlist, value: nextPlaylistState(playlist, t.value, { elapsedSeconds: 1, unacknowledgedIncident: unack.current }) }
          : t,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [playlist, rotates]);
  return current.value;
}
