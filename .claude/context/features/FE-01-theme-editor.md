---
id: FE-01
title: "Theme editor"
area: frontend
group: "Theming and personalization"
status: in-progress
screens: [theme-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-01 · Theme editor

## Summary
Create/edit a color theme (`bg`, `s1–s3`, `line`, `text/muted/dim`, `ok/warn/down/info`) with live preview of the wall and console

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[theme-editor](../screens/theme-editor.md)

## Code
- `frontend/src/domains/settings/appearance/ThemeEditor/ThemeEditor.tsx`
- `frontend/src/domains/settings/appearance/ColorField/ColorField.tsx`
- `frontend/src/domains/settings/appearance/WallPreview/WallPreview.tsx`
- `frontend/src/domains/settings/appearance/ConsolePreview/ConsolePreview.tsx`
- `frontend/src/domains/settings/appearance/AppearanceSettings/AppearanceSettings.tsx`

## Tests
- `frontend/src/domains/settings/appearance/ThemeEditor/ThemeEditor.test.tsx`
- `frontend/src/domains/settings/appearance/AppearanceSettings/AppearanceSettings.test.tsx`

## Decisions and notes
- Every one of the 30 token paths is editable (hex text field + native picker; alpha kept from the text field). Invalid hex is flagged with aria-invalid and never reaches the preview.
- Previews scope the draft through inline CSS variables, so Tailwind classes inside render the draft without touching the page theme. Wall preview shows states with text (DOWN/WARNING/OK).
- Contrast problems are grouped per token with one "Use suggested value" each plus "Fix all"; Save stays disabled until the guard passes.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — editor implemented with live wall/console preview and contrast guard; moved to src/domains/settings/appearance (status: in-progress until wired into Settings → Appearance).
- 2026-10-18 — editor reachable from the gallery (Duplicate & edit, Edit); saving applies the new theme on the device.
