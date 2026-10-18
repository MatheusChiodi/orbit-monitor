---
id: FE-51
title: "Component motion system"
area: frontend
group: "Theming and personalization"
status: planned
screens: [wall, monitor-list, monitor-editor-http, monitor-editor-sql, data-and-display, layout-editor, theme-editor, preferences, incidents, incident-detail, settings]
spec: docs/03-design.md §4.1
updated: 2026-10-18
---

# FE-51 · Component motion system

## Summary
Every component animates enter, exit, status change (OK/WARN/DOWN), value change, threshold crossing, reorder, expand/collapse, loading and drag, using shared motion tokens and presets, scaled by the animation level (FE-06) and disabled by `prefers-reduced-motion`.

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
All screens (see frontmatter).

## Code
_None yet._ Planned: `frontend/src/shared/motion/tokens.ts`, `frontend/src/shared/motion/presets.ts`, `useMotionPreset` hook.

## Tests
_None yet._ Each component test must cover: enter/exit via `AnimatePresence`, status-change transition, value-change flash, and zero motion for `off` / reduced motion.

## Decisions and notes
- Only `opacity`, `transform` and colors are animated; no springs; translate ≤ 8 px; numbers never count.

## Changelog
- 2026-10-18 — context file created (status: planned).
