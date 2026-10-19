---
id: FE-16
title: "Layout templates"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-16 · Layout templates

## Summary
NOC, Executive, Team, Single incident

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/workspace/layout/templates.ts`

## Tests
- `frontend/src/domains/workspace/layout/templates.test.ts`

## Decisions and notes
- NOC, Executive, Team and Single incident templates fit the 12 columns without overlap; `templateById` returns a copy; no template block shows personal data.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — layout templates (status: done).
