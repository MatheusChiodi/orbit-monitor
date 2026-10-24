---
screen: preferences
title: "Device preferences"
route: "index.html#/settings/advanced"
status: in-progress
spec: docs/05-extended-features.md FE-06..FE-09, FE-47, FE-48, FE-50
updated: 2026-10-24
---

# Device preferences

## Purpose
Language, animation level, density, viewing distance, night mode, sounds, notifications.

## Layout and components
- FE-72: part of the one Settings area. Theme, density, text size and animation moved to Settings › Appearance; language to Settings › General; viewing distance (explained), the device preferences file, wall sound and Motion details live in Settings › Advanced. `#/settings/preferences` redirects to Appearance.
- Console header button "Device preferences" (or `index.html#/settings/preferences`) → `ConsoleApp` view `preferences`
  - `DevicePreferences` (Panel): theme, animation level (+ reduced-motion notice), density, language, viewing distance (no operator name); "workspace default" markers; export / import JSON; reset
- State: `createPreferencesStore()` (`shared/preferences/preferences.ts`), applied by `app/console/usePreferenceEffects.ts`
- Night mode (FE-09) is configured on the wall URL (`?night=22:00-06:00`) for now

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-15 · Internationalization (en / pt-BR)](../features/CORE-15-internationalization-en-pt-br.md) — done
- [FE-06 · Animation level](../features/FE-06-animation-level.md) — done
- [FE-07 · Density](../features/FE-07-density.md) — done
- [FE-08 · Viewing distance scale](../features/FE-08-viewing-distance-scale.md) — done
- [FE-09 · Night mode schedule](../features/FE-09-night-mode-schedule.md) — done
- [FE-47 · Sound alerts](../features/FE-47-sound-alerts.md) — done
- [FE-48 · Desktop notifications](../features/FE-48-desktop-notifications.md) — done
- [FE-50 · Device preferences](../features/FE-50-device-preferences.md) — done
- [FE-56 · Typography, shape and density settings](../features/FE-56-typography-shape-density.md) — done

## Code
- `frontend/src/domains/workspace/DevicePreferences/DevicePreferences.tsx`
- `frontend/src/shared/preferences/preferences.ts`
- `frontend/src/shared/preferences/density.ts`
- `frontend/src/shared/preferences/viewingDistance.ts`
- `frontend/src/app/console/usePreferenceEffects.ts`
- `frontend/src/app/console/ConsoleApp.tsx`
- `frontend/src/domains/workspace/MotionSettingsPanel/MotionSettingsPanel.tsx`

- `frontend/src/app/settings/AdvancedSettings/AdvancedSettings.tsx`
- `frontend/src/app/settings/AdvancedSettings/WallSoundCard.tsx`
- `frontend/src/domains/settings/appearance/DisplayControls/DisplayControls.tsx`

## Tests
- `frontend/src/domains/workspace/DevicePreferences/DevicePreferences.test.tsx`
- `frontend/src/shared/preferences/preferences.test.ts`
- `frontend/src/shared/preferences/density.test.ts`
- `frontend/src/app/console/ConsoleApp.preferences.test.tsx`
- `frontend/src/domains/workspace/MotionSettingsPanel/MotionSettingsPanel.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — device preferences screen built and wired into the console (FE-07, FE-08, FE-50).
- 2026-10-22 — density and animation level are also editable from the customization settings (bridged to the device preferences).
- 2026-10-22 — FE-06 animation settings panel with live preview embedded.
- 2026-10-22 — operator name field removed.
- 2026-10-24 — FE-72: device preferences split between Appearance (theme, density, text size, one animation control) and Advanced (viewing distance, file, sound, motion details); duplicate controls removed.
