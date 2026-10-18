import { describe, expect, it } from 'vitest';
import { nextPlaylistState, type Playlist } from './playlist';

const playlist: Playlist = {
  entries: [
    { layout: 'noc', seconds: 60 },
    { layout: 'executive', seconds: 30 },
    { layout: 'payments-team', seconds: 45 },
  ],
};

describe('FE-19 layout playlist (pure)', () => {
  it('starts on the first layout', () => {
    const state = nextPlaylistState(playlist, null, { elapsedSeconds: 0, unacknowledgedIncident: false });
    expect(state).toEqual({ index: 0, layout: 'noc', remainingSeconds: 60, paused: false });
  });

  it('advances after each entry duration and wraps around', () => {
    let state = nextPlaylistState(playlist, null, { elapsedSeconds: 0, unacknowledgedIncident: false });
    state = nextPlaylistState(playlist, state, { elapsedSeconds: 60, unacknowledgedIncident: false });
    expect(state.layout).toBe('executive');
    state = nextPlaylistState(playlist, state, { elapsedSeconds: 30, unacknowledgedIncident: false });
    expect(state.layout).toBe('payments-team');
    state = nextPlaylistState(playlist, state, { elapsedSeconds: 45, unacknowledgedIncident: false });
    expect(state.layout).toBe('noc');
  });

  it('counts down the remaining time within an entry', () => {
    const start = nextPlaylistState(playlist, null, { elapsedSeconds: 0, unacknowledgedIncident: false });
    expect(nextPlaylistState(playlist, start, { elapsedSeconds: 20, unacknowledgedIncident: false }).remainingSeconds).toBe(40);
  });

  it('pauses while an incident is unacknowledged and resumes afterwards', () => {
    const start = nextPlaylistState(playlist, null, { elapsedSeconds: 0, unacknowledgedIncident: false });
    const paused = nextPlaylistState(playlist, start, { elapsedSeconds: 600, unacknowledgedIncident: true });
    expect(paused).toMatchObject({ layout: 'noc', paused: true, remainingSeconds: 60 });
    const resumed = nextPlaylistState(playlist, paused, { elapsedSeconds: 10, unacknowledgedIncident: false });
    expect(resumed).toMatchObject({ layout: 'noc', paused: false, remainingSeconds: 50 });
  });

  it('a single-entry or empty playlist never rotates', () => {
    const single: Playlist = { entries: [{ layout: 'noc', seconds: 10 }] };
    const s = nextPlaylistState(single, null, { elapsedSeconds: 0, unacknowledgedIncident: false });
    expect(nextPlaylistState(single, s, { elapsedSeconds: 100, unacknowledgedIncident: false }).layout).toBe('noc');
    expect(nextPlaylistState({ entries: [] }, null, { elapsedSeconds: 0, unacknowledgedIncident: false }).layout).toBeNull();
  });

  it('durations below 5 s are raised to 5 s (no flicker)', () => {
    const fast: Playlist = { entries: [{ layout: 'a', seconds: 1 }, { layout: 'b', seconds: 1 }] };
    const s = nextPlaylistState(fast, null, { elapsedSeconds: 0, unacknowledgedIncident: false });
    expect(s.remainingSeconds).toBe(5);
  });
});
