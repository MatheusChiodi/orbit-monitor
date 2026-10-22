---
id: FE-50
title: "Device preferences"
area: frontend
group: "Wall runtime and preferences"
status: done
screens: [preferences, settings]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-50 · Device preferences

## Summary
Theme, animation level, density, language, scale and operator name saved on the device, with workspace defaults from the server and JSON export/import

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[preferences](../screens/preferences.md), [settings](../screens/settings.md)

## Code
- `frontend/src/shared/preferences/preferences.ts`
- `frontend/src/shared/preferences/index.ts`
- `frontend/src/domains/workspace/DevicePreferences/DevicePreferences.tsx`
- `frontend/src/app/console/ConsoleApp.tsx` (header button, `#/settings/preferences`)
- `frontend/src/app/console/usePreferenceEffects.ts`
- `frontend/src/test/setup.ts` (jsdom `matchMedia` default)

## Tests
- `frontend/src/shared/preferences/preferences.test.ts`
- `frontend/src/domains/workspace/DevicePreferences/DevicePreferences.test.tsx`
- `frontend/src/app/console/ConsoleApp.preferences.test.tsx`

## Decisions and notes
- Zustand vanilla store (already in the stack) holding only the device choices in `localStorage` (`orbit.preferences`); effective = built-in defaults ← workspace defaults ← device choices. Every load/import goes through a per-key validator, so unknown keys, secrets, probe rows and config are dropped (docs/04-data-protection.md).
- Export/import file: `{ "version": 1, "preferences": {…} }`; invalid JSON or another version returns a translatable error and keeps the current preferences.
- The screen marks fields that come from the workspace defaults, warns when `prefers-reduced-motion` forces animations off, and resets to the workspace defaults.
- Console wiring: the animation level feeds `AnimationLevelProvider` (reduced motion still forces off), density is applied at once, language and operator name follow later changes only so the startup locale/operator are not overridden.
- Open: theme choice is stored but not applied yet — `ThemeProvider` (FE-03, orbit-themes) is not mounted in the console; workspace defaults are not fetched yet (store exposes `setWorkspaceDefaults` for when the console API reads `orbit.settings.json`).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-22 — implemented preferences store, export/import, DevicePreferences screen and console wiring (status: done).
