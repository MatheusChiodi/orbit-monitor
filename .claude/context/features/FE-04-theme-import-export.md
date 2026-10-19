---
id: FE-04
title: "Theme import/export"
area: frontend
group: "Theming and personalization"
status: tests-pending
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
_None yet._

## Tests
- `frontend/src/domains/workspace/theme/themeFile.pending.test.ts`

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — scope expanded (30 built-in themes + accessibility, VS Code import).
