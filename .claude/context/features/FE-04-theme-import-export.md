---
id: FE-04
title: "Theme import/export"
area: frontend
group: "Theming and personalization"
status: in-progress
screens: [theme-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-04 · Theme import/export

## Summary
Orbit theme JSON (schema-validated), import of VS Code color theme `.json` with token mapping and contrast fixes, sharing with the workspace. See docs/05 §1.3.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[theme-editor](../screens/theme-editor.md)

## Code
- `frontend/src/shared/theme/schema.ts`
- `frontend/src/shared/theme/themeFile.ts`
- `frontend/src/shared/theme/vscodeImport.ts`
- `frontend/src/shared/theme/paths.ts`

## Tests
- `frontend/src/shared/theme/themeFile.test.ts`
- `frontend/src/shared/theme/vscodeImport.test.ts`
- `frontend/src/shared/theme/paths.test.ts`

## Decisions and notes
- Orbit file: `{ version: 1, theme }`; `validateTheme` rebuilds a clean object (unknown fields dropped, colors only `#rgb/#rrggbb/#rrggbbaa`, https-only url, name ≤ 60, id slug). Imported themes are always `category: custom`. Max 256 KB (VS Code: 1 MB).
- VS Code import accepts JSONC (comments, trailing commas) via a string-aware stripper; maps editor/sideBar/activityBar/panel backgrounds, foregrounds, terminal ANSI colors, focusBorder and tokenColors scopes; `#rgba` shorthand supported; then `fixTheme` runs and every change is returned as `fixes` for review before saving.
- Persistence contract proposed to backend-agent: `GET/POST /api/themes`, `PUT/DELETE /api/themes/{id}` (`orbit.themes.json`, `{ version, items }`), workspace default in `orbit.settings.json` `appearance.themeId`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — scope expanded (30 built-in themes + accessibility, VS Code import).
- 2026-10-18 — Orbit theme file, schema validation and VS Code import with contrast fixes implemented; review UI next (status: in-progress).
