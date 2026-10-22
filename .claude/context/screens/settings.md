---
screen: settings
title: "Settings and config files"
route: "index.html#/settings"
status: in-progress
spec: docs/06-configuration-files.md
updated: 2026-10-22
---

# Settings and config files

## Purpose
Access mode banner (edit / view-only), workspace defaults, config export/import, config file health.

## Layout and components
- `SettingsScreen` (`frontend/src/app/settings/SettingsScreen/`): edit-mode note or `ViewOnlyBanner`, workspace defaults (default language), config files table (OK / Not created yet / Invalid + error), Export config (no secrets), Import config (file → dry-run diff → Apply import)
- Pending: theme/animation/density defaults (FE-50), wiring to the backend endpoints and console navigation
- `CustomizationScreen` (`index.html#/settings/customization`, header button "Customization"): tabs Customization (registry-generated settings with scope selector, search, modified filter, resets, JSON view), Names and terminology (FE-54), Profiles (FE-57)

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-08 · Access policy, vault and audit](../features/CORE-08-access-policy-vault-and-audit.md) — in-progress
- [CORE-19 · Per-feature JSON configuration files](../features/CORE-19-per-feature-json-configuration-files.md) — done
- [CORE-20 · Local-first runtime](../features/CORE-20-local-first-runtime.md) — in-progress
- [CORE-15 · Internationalization (en / pt-BR)](../features/CORE-15-internationalization-en-pt-br.md) — done
- [FE-37 · Onboarding](../features/FE-37-onboarding.md) — done
- [FE-50 · Device preferences](../features/FE-50-device-preferences.md) — tests-pending
- [CORE-21 · Customization registry](../features/CORE-21-customization-registry.md) — done
- [FE-53 · Customize mode and inspector](../features/FE-53-customize-mode.md) — done
- [FE-54 · Terminology editor](../features/FE-54-terminology-editor.md) — done
- [FE-56 · Typography, shape and density settings](../features/FE-56-typography-shape-density.md) — done
- [FE-57 · Customization profiles](../features/FE-57-customization-profiles.md) — done

## Code
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.tsx`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.tsx`
- `frontend/src/app/settings/SettingsScreen/SettingsScreen.tsx`
- `frontend/src/app/settings/configTransfer.ts`
- `frontend/src/app/console/screens/SettingsRoute/SettingsRoute.tsx`
- `frontend/src/app/console/screens/SettingsRoute/settingsApi.ts`
- frontend/src/domains/customization/CustomizationScreen/CustomizationScreen.tsx

## Tests
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.test.tsx`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.test.tsx`
- `frontend/src/app/settings/SettingsScreen/SettingsScreen.test.tsx`
- `frontend/src/app/settings/configTransfer.test.ts`
- `frontend/src/app/console/screens/SettingsRoute/settingsApi.test.ts`
- frontend/src/app/console/ConsoleApp.customization.test.tsx

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — operator name, access banner and language selector available in the console.
- 2026-10-18 — settings screen with access mode, operator name, defaults, config health and export/import.
- 2026-10-18 — settings screen with access mode, operator name, defaults, config health and export/import.
- 2026-10-18 — settings screen with access mode, operator name, defaults, config health and export/import.
- 2026-10-22 — `#/settings` wired to /api/settings, /api/config/health and the zip export/import with dry-run diff.
- 2026-10-22 — customization screen (settings, names, profiles) added to the console.
- 2026-10-22 — workspace defaults (language, animation level, density) through /api/settings/defaults.
- 2026-10-22 — operator name field and `OperatorPrompt` removed (BE-45 retired in the UI).
