---
id: FE-19
title: "Layout playlist"
area: frontend
group: "Drag and drop and layout"
status: in-progress
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-19 · Layout playlist

## Summary
Rotate layouts with per-layout duration; pauses while an incident is unacknowledged

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/wall/playlist/playlist.ts`
- `frontend/src/domains/wall/playlist/usePlaylist.ts`

## Tests
- `frontend/src/domains/wall/playlist/playlist.test.ts`
- `frontend/src/domains/wall/playlist/usePlaylist.test.ts`

## Decisions and notes
- Pure `nextPlaylistState` wraps around, enforces a 5 s minimum per entry and freezes while an incident is unacknowledged; one entry never rotates.
- Pending: wire `usePlaylist` into the wall with a layout cross-fade.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — layout playlist logic (status: in-progress).
