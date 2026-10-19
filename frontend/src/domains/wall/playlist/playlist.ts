/** FE-19: wall layouts rotate in a playlist; rotation pauses while an incident is unacknowledged. */
export interface PlaylistEntry {
  layout: string;
  seconds: number;
}

export interface Playlist {
  entries: PlaylistEntry[];
}

export interface PlaylistState {
  index: number;
  layout: string | null;
  remainingSeconds: number;
  paused: boolean;
}

export interface PlaylistTick {
  elapsedSeconds: number;
  unacknowledgedIncident: boolean;
}

/** Entries shorter than this would flicker. */
export const MIN_ENTRY_SECONDS = 5;

function duration(entry: PlaylistEntry | undefined): number {
  return Math.max(MIN_ENTRY_SECONDS, entry?.seconds ?? MIN_ENTRY_SECONDS);
}

/** Pure step: advances the playlist by `elapsedSeconds`, wrapping around at the end. */
export function nextPlaylistState(playlist: Playlist, previous: PlaylistState | null, tick: PlaylistTick): PlaylistState {
  const { entries } = playlist;
  if (entries.length === 0) return { index: 0, layout: null, remainingSeconds: 0, paused: false };
  if (!previous) {
    return { index: 0, layout: entries[0]!.layout, remainingSeconds: duration(entries[0]), paused: tick.unacknowledgedIncident };
  }
  if (tick.unacknowledgedIncident) return { ...previous, paused: true };
  if (entries.length === 1) return { index: 0, layout: entries[0]!.layout, remainingSeconds: duration(entries[0]), paused: false };

  let index = previous.index % entries.length;
  let remaining = previous.remainingSeconds - tick.elapsedSeconds;
  while (remaining <= 0) {
    index = (index + 1) % entries.length;
    remaining += duration(entries[index]);
  }
  return { index, layout: entries[index]!.layout, remainingSeconds: remaining, paused: false };
}
