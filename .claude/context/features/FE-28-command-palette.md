---
id: FE-28
title: "Command palette"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-list]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-28 · Command palette

## Summary
`Ctrl+K` searches monitors, groups, layouts and actions

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md)

## Code
- `frontend/src/app/console/CommandPalette/CommandPalette.tsx`
- `frontend/src/app/console/CommandPalette/palette.ts`
- `frontend/src/app/console/ConsoleApp.tsx`

## Tests
- `frontend/src/app/console/CommandPalette/CommandPalette.test.tsx`
- `frontend/src/app/console/ConsoleApp.test.tsx`

## Decisions and notes
- `Ctrl+K` / `⌘K` opens a combobox dialog (`aria-activedescendant`, arrows + Enter, Escape returns focus); accent/case-insensitive search, prefix matches first, results grouped by kind; edit actions hidden in view-only.
- Console items: monitors (hint = group), groups, "New monitor", "Open wall"; layouts join when FE-11 lands.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — command palette in the console (status: done).
