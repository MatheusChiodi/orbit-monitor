---
id: FE-57
title: "Customization profiles"
area: frontend
group: "Customization"
status: done
screens: [settings]
spec: docs/07-customization.md
updated: 2026-10-22
---

# FE-57 · Customization profiles

## Summary
Named bundles of settings (NOC, Executive, Night shift…), built-in and custom, apply per device or layout, export/import.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/shared/customization/profiles.ts`
- `frontend/src/shared/customization/store.ts (`saveProfile`, `deleteProfile`)`
- `frontend/src/domains/customization/ProfilesPanel/ProfilesPanel.tsx`
- `frontend/src/domains/customization/ProfilesPanel/ProfileCard.tsx`
- `frontend/src/domains/customization/CustomizationScreen/CustomizationScreen.tsx (Profiles tab)`

## Tests
- `frontend/src/shared/customization/profiles.test.ts`
- `frontend/src/domains/customization/ProfilesPanel/ProfilesPanel.test.tsx`
- `frontend/src/app/console/ConsoleApp.customization.test.tsx`

## Decisions and notes
- Built-in: Orbit default (empty, resets the target), TV wall, Compact console, Accessible (larger text, thick borders, flat surfaces, no glass, minimal motion). Names and descriptions translated (en / pt-BR).
- Applying replaces the values of the target scope (this device or one wall layout) with the profile's, sanitized for that scope. Custom profiles are entries of `orbit.customization.json` (scope `profile`, target `<slug>`; descriptions are kept for built-ins only), created from the current device settings, duplicated, deleted, exported and imported.
- Export file is the BE-51 profile file `{ "format": "orbit.customization-profile", "version": 1, name, values }`; import validates format, version and name and keeps only registered settings, so secrets or unknown keys never travel (docs/07 §5). Disabled for view-only clients.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-22 — built-in and custom profiles with apply to device or layout, duplicate, export and import (status: done).
