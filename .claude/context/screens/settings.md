---
screen: settings
title: "Settings"
route: "index.html#/settings[/:section]"
status: in-progress
spec: docs/06-configuration-files.md
updated: 2026-10-24
---

# Settings

## Purpose
The one Settings area (FE-72): sub-nav with General · Appearance · Wall layouts · Connections · Advanced.

## Layout and components
- `SettingsRoute` (`frontend/src/app/console/screens/SettingsRoute/`): PageHeader "Settings", sub-nav (`SettingsNav`: link list from 1024 px, section select below), section h2 and body.
- General (`GeneralSettings`): device language, access as read-only status (or the view-only notice), workspace language default (Save defaults → toast), config files table, Export configuration, Import configuration with the styled `FilePicker` → dry-run diff → Apply import.
- Appearance (`AppearancePage` → `AppearanceSettings`): see theme-editor.md.
- Wall layouts (`LayoutsPage`): see layout-editor.md.
- Connections: `domains/connections/ConnectionsSettings` (owned by the monitor-creation bucket).
- Advanced (`AdvancedSettings`): Customize mode switch (`Ctrl+.`), This device (viewing distance explained, export/import/reset device preferences), Wall sound, Motion details, then tabs All settings (registry with scope "Applies to", search, modified filter, resets, JSON view) · Names and terms · Profiles.
- Legacy hashes (`#/settings/preferences`, `#/settings/themes`, `#/settings/customization`, `#/layouts[/:id]`) redirect in the shell.

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
- [FE-72 · Settings hub](../features/FE-72-settings-hub.md) — done

## Code
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.tsx`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.tsx`
- `frontend/src/app/settings/GeneralSettings/GeneralSettings.tsx`
- `frontend/src/app/settings/GeneralSettings/ConfigImport.tsx`
- `frontend/src/app/settings/SettingsNav/SettingsNav.tsx`
- `frontend/src/app/settings/sections.ts`
- `frontend/src/app/settings/AdvancedSettings/AdvancedSettings.tsx`
- `frontend/src/app/settings/configTransfer.ts`
- `frontend/src/app/console/screens/SettingsRoute/SettingsRoute.tsx`
- `frontend/src/app/console/screens/SettingsRoute/settingsApi.ts`
- frontend/src/domains/customization/CustomizationScreen/CustomizationScreen.tsx

## Tests
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.test.tsx`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.test.tsx`
- `frontend/src/app/settings/GeneralSettings/GeneralSettings.test.tsx`
- `frontend/src/app/console/screens/SettingsRoute/SettingsRoute.test.tsx`
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
- 2026-10-24 — FE-72: one Settings area with sub-nav (General, Appearance, Wall layouts, Connections, Advanced); `SettingsScreen` became `GeneralSettings` with the styled file picker; Customize mode, registry, profiles and terminology moved to Advanced.
