---
screen: settings
title: "Settings and config files"
route: "index.html#/settings"
status: in-progress
spec: docs/06-configuration-files.md
updated: 2026-10-18
---

# Settings and config files

## Purpose
Access mode banner (edit / view-only), operator name, workspace defaults, config export/import, config file health.

## Layout and components
- `SettingsScreen` (`frontend/src/app/settings/SettingsScreen/`): edit-mode note or `ViewOnlyBanner`, operator name, workspace defaults (default language), config files table (OK / Not created yet / Invalid + error), Export config (no secrets), Import config (file → dry-run diff → Apply import)
- Pending: theme/animation/density defaults (FE-50), wiring to the backend endpoints and console navigation

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-08 · Access policy, vault and audit](../features/CORE-08-access-policy-vault-and-audit.md) — in-progress
- [CORE-19 · Per-feature JSON configuration files](../features/CORE-19-per-feature-json-configuration-files.md) — in-progress
- [CORE-20 · Local-first runtime](../features/CORE-20-local-first-runtime.md) — in-progress
- [CORE-15 · Internationalization (en / pt-BR)](../features/CORE-15-internationalization-en-pt-br.md) — in-progress
- [FE-37 · Onboarding](../features/FE-37-onboarding.md) — tests-pending
- [FE-50 · Device preferences](../features/FE-50-device-preferences.md) — tests-pending

## Code
- `frontend/src/domains/security/OperatorPrompt/OperatorPrompt.tsx`
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.tsx`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.tsx`
- `frontend/src/app/settings/SettingsScreen/SettingsScreen.tsx`
- `frontend/src/app/settings/configTransfer.ts`

## Tests
- `frontend/src/domains/security/OperatorPrompt/OperatorPrompt.test.tsx`
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.test.tsx`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.test.tsx`
- `frontend/src/app/settings/SettingsScreen/SettingsScreen.test.tsx`
- `frontend/src/app/settings/configTransfer.test.ts`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — operator name, access banner and language selector available in the console.
- 2026-10-18 — settings screen with access mode, operator name, defaults, config health and export/import.
- 2026-10-18 — settings screen with access mode, operator name, defaults, config health and export/import.
- 2026-10-18 — settings screen with access mode, operator name, defaults, config health and export/import.
