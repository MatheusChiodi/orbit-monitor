---
id: FE-19
title: "Layout playlist"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-19 · Layout playlist

## Summary
Rotate layouts with per-layout duration; pauses while an incident is unacknowledged

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/wall/playlist/playlist.ts`
- `frontend/src/domains/wall/playlist/usePlaylist.ts`
- `frontend/src/domains/wall/layout/useWallLayouts.ts`
- `frontend/src/domains/wall/components/WallScreen/WallScreen.tsx`
- `frontend/src/domains/wall/components/WallControls/WallControls.tsx`
- `frontend/src/domains/workspace/LayoutSettings/LayoutSettings.tsx`

## Tests
- `frontend/src/domains/wall/playlist/playlist.test.ts`
- `frontend/src/domains/wall/playlist/usePlaylist.test.ts`
- `frontend/src/domains/wall/layout/useWallLayouts.test.ts`
- `frontend/src/domains/wall/WallApp/WallApp.layout.test.tsx`
- `frontend/src/app/console/ConsoleApp.theming.test.tsx`

## Decisions and notes
- Pure `nextPlaylistState` wraps around, enforces a 5 s minimum per entry and freezes while an incident is unacknowledged; one entry never rotates.
- Wall: a layout with `playlist.entries` (`{ layout: <slug>, seconds }`) rotates through those layouts; each entry layout is loaded once by slug. Layouts cross-fade (old and new stacked in `.wall-stage`, hero preset, instant when off). Any unacknowledged incident holds the rotation; the header says "Layout n of N" or "Rotation paused: unacknowledged incident" (`role=status`). Theme and animation follow the layout on screen. `usePlaylist` restarts when the playlist changes and starts no timer for fewer than two entries.
- Editing: Layout settings → Playlist (layout + seconds rows, minimum 5 s, add/remove).
- BE-41 now stores `playlist` (`entries[{layout, seconds ≥ 5}]`, slugs validated), so a playlist edited in the layout editor rotates on the wall end to end.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — layout playlist logic (status: in-progress).
- 2026-10-22 — playlist wired into the wall with cross-fade, pause on unacknowledged incident and status text.
- 2026-10-22 — playlist editor in the layout settings; waiting for BE-41 to persist `playlist`.
- 2026-10-22 — BE-41 persists the playlist (status: done).
