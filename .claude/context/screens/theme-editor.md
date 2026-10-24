---
screen: theme-editor
title: "Theme editor"
route: "index.html#/settings/appearance"
status: done
spec: docs/05-extended-features.md FE-01..FE-05
updated: 2026-10-24
---

# Theme editor

## Purpose
Create/edit color themes with contrast guard and presets, import/export.

## Layout and components
- FE-72: 8 suggested themes + "Show all" with search and filters; per-card "…" menu (Duplicate & edit, Export, Edit, Delete); preview-then-apply with a sticky footer ("Use on this device", "Make workspace default"); no duplicated page title. The editor and VS Code import stay reachable (card menu, "Import theme…" and "More theme options").
- Route `index.html#/settings/themes` (header button "Appearance") → `AppearancePage` → `AppearanceSettings` (`ThemeGallery` + `ThemeEditor`, import review)
- `ConsoleTheme` (in `ConsoleApp`) provides the ThemeProvider: device theme from FE-50 preferences, BE-40 workspace default, custom themes from `/api/themes`
- Code: `frontend/src/app/console/AppearancePage/`, `frontend/src/app/console/ConsoleTheme/`, `frontend/src/domains/settings/appearance/`

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-19 · Per-feature JSON configuration files](../features/CORE-19-per-feature-json-configuration-files.md) — done
- [FE-01 · Theme editor](../features/FE-01-theme-editor.md) — in-progress
- [FE-02 · Contrast guard](../features/FE-02-contrast-guard.md) — done
- [FE-03 · Theme presets](../features/FE-03-theme-presets.md) — in-progress
- [FE-04 · Theme import/export](../features/FE-04-theme-import-export.md) — in-progress
- [FE-05 · Per-layout theme](../features/FE-05-per-layout-theme.md) — in-progress

## Code
- `frontend/src/domains/settings/appearance/ThemeEditor/ThemeEditor.tsx` (editor, live wall and console previews)
- `frontend/src/shared/theme/` (tokens, built-in themes, contrast guard, import/export, provider)

- `frontend/src/domains/settings/appearance/ThemeGallery/ThemeGallery.tsx`
- `frontend/src/domains/settings/appearance/ThemeCard/ThemeCard.tsx`
- `frontend/src/domains/settings/appearance/AppearanceSettings/AppearanceSettings.tsx`

## Tests
- `frontend/src/domains/settings/appearance/ThemeEditor/ThemeEditor.test.tsx`
- `frontend/src/shared/theme/*.test.ts(x)`

- `frontend/src/domains/settings/appearance/ThemeGallery/ThemeGallery.test.tsx`
- `frontend/src/domains/settings/appearance/AppearanceSettings/AppearanceSettings.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — theme editor and theme core implemented (FE-01..FE-05 in progress, FE-02 done).
- 2026-10-22 — route `#/settings/themes` and console ThemeProvider mounted.
- 2026-10-24 — FE-72: Appearance inside Settings — curated gallery, card menus, preview then apply from a sticky footer, density/text size/animation controls.
