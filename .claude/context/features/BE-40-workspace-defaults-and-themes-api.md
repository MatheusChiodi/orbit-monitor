---
id: BE-40
title: "Workspace defaults and themes API"
area: backend
group: "Workspace and configuration"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-40 · Workspace defaults and themes API

## Summary
Default theme, animation level, density, locale and scale; custom themes with server-side contrast validation

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/theme/ThemeService.java`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/theme/ThemeServiceTest.java`

## Decisions and notes
- WCAG contrast computed server-side (4.5:1 text, 3:1 large labels) before a custom theme is saved in orbit.themes.json; defaults live in orbit.settings.json.
- `ThemeService.validate`: required tokens `--bg --s1 --text --muted --ok --warn --down --info`, each `#rrggbb`; `--text`/`--muted` need 4.5:1 and state colors 3:1 against both `--bg` and `--s1` (WCAG 2.x relative luminance, sRGB linearization with the 0.04045 threshold). Errors name the token and ratio. Built-in defaults: `dark`, `full`, `comfortable`, `en`, 1.0.
- Still to do: `orbit.themes.json` CRUD endpoints (schema already in orbit-config) and defaults in `orbit.settings.json` over the API.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — WCAG contrast validation and built-in defaults implemented; ThemeServiceTest un-pended (API pending).
