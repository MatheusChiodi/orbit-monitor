---
id: FE-05
title: "Per-layout theme"
area: frontend
group: "Theming and personalization"
status: in-progress
screens: [theme-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-05 · Per-layout theme

## Summary
A wall layout can override the console theme

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[theme-editor](../screens/theme-editor.md)

## Code
- `frontend/src/shared/theme/scope.ts`
- `frontend/src/shared/theme/applyTheme.ts`
- `frontend/src/shared/theme/transition.css`
- `frontend/src/shared/theme/ThemeProvider.tsx`

## Tests
- `frontend/src/shared/theme/scope.test.ts`
- `frontend/src/shared/theme/applyTheme.test.ts`
- `frontend/src/shared/theme/ThemeProvider.test.tsx`

## Decisions and notes
- Precedence (highest first): `?theme=` → wall layout `themeId` (`orbit.layouts.json`) → device (FE-50) → workspace default (`orbit.settings.json`) → Orbit Dark. `system` follows `prefers-color-scheme` with a light/dark pair (default orbit-dark / github-light). Unknown ids fall through to the next level.
- `applyTheme` writes CSS variables inline on the target (`<html>` by default): the 14 color tokens (`--line-2` for line2), derived `--ok/warn/down-text` (≥ 4.5:1 on s1), `--chart-1..6`, `--syntax-*`, `--fx-from/to/glow`, `data-theme` and `color-scheme`.
- Remaining: the wall entry and the layout editor pass `layoutThemeId` (frontend-agent integration).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — scope resolution, applyTheme with 280 ms cross-fade and ThemeProvider implemented (status: in-progress until the wall passes the layout theme).
