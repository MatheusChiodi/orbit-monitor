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
- Built so far: `OperatorPrompt` (first visit and "Change name" in the console header), `ViewOnlyBanner`, `LanguageSelector`
- Pending: workspace defaults, config export/import, config file health

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-08 · Access policy, vault and audit](../features/CORE-08-access-policy-vault-and-audit.md) — in-progress
- [CORE-19 · Per-feature JSON configuration files](../features/CORE-19-per-feature-json-configuration-files.md) — in-progress
- [CORE-20 · Local-first runtime](../features/CORE-20-local-first-runtime.md) — planned
- [CORE-15 · Internationalization (en / pt-BR)](../features/CORE-15-internationalization-en-pt-br.md) — in-progress
- [FE-37 · Onboarding](../features/FE-37-onboarding.md) — planned
- [FE-50 · Device preferences](../features/FE-50-device-preferences.md) — planned

## Code
- `frontend/src/domains/security/OperatorPrompt/OperatorPrompt.tsx`
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.tsx`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.tsx`

## Tests
- `frontend/src/domains/security/OperatorPrompt/OperatorPrompt.test.tsx`
- `frontend/src/domains/security/ViewOnlyBanner/ViewOnlyBanner.test.tsx`
- `frontend/src/shared/i18n/LanguageSelector/LanguageSelector.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — operator name, access banner and language selector available in the console.
