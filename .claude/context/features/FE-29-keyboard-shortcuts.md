---
id: FE-29
title: "Keyboard shortcuts"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-list]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-29 · Keyboard shortcuts

## Summary
Global shortcuts with a `?` cheat sheet

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md)

## Code
- `frontend/src/app/console/ShortcutsHelp/ShortcutsHelp.tsx`
- `frontend/src/app/console/ShortcutsHelp/shortcuts.ts`
- `frontend/src/app/console/ConsoleApp.tsx`

## Tests
- `frontend/src/app/console/ShortcutsHelp/ShortcutsHelp.test.tsx`
- `frontend/src/app/console/ConsoleApp.test.tsx`

## Decisions and notes
- `Mod` = Ctrl or ⌘; single-key shortcuts never fire while typing; `?` opens the cheat sheet (`<kbd>` per key, platform-friendly labels); `N` = new monitor in edit mode.
- Dialogs leave through `AnimatePresence` (FE-51), so tests wait for the exit.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — keyboard shortcuts and cheat sheet (status: done).
