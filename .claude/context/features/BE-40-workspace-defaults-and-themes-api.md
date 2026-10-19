---
id: BE-40
title: "Workspace defaults and themes API"
area: backend
group: "Workspace and configuration"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-40 · Workspace defaults and themes API

## Summary
Default theme, animation level, density, locale and scale; custom themes with server-side contrast validation

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/theme/ThemeService.java`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/theme/ThemeServiceTest.java`

## Decisions and notes
- WCAG contrast computed server-side (4.5:1 text, 3:1 large labels) before a custom theme is saved in orbit.themes.json; defaults live in orbit.settings.json.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
