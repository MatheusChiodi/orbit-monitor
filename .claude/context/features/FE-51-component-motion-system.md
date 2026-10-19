---
id: FE-51
title: "Component motion system"
area: frontend
group: "Theming and personalization"
status: tests-pending
screens: [wall, monitor-list, monitor-editor-http, monitor-editor-sql, data-and-display, layout-editor, theme-editor, preferences, incidents, incident-detail, settings]
spec: docs/03-design.md §4.1
updated: 2026-10-18
---

# FE-51 · Component motion system

## Summary
Every component animates enter, exit, status change (OK/WARN/DOWN), value change, threshold crossing, reorder, expand/collapse, loading and drag, using shared motion tokens and presets, scaled by the animation level (FE-06) and disabled by `prefers-reduced-motion`.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
All screens (see frontmatter).

## Code
_None yet._ Planned: `frontend/src/shared/motion/tokens.ts`, `frontend/src/shared/motion/presets.ts`, `useMotionPreset` hook.

## Tests
- `frontend/src/domains/monitor/components/ConditionEditor/ConditionEditor.motion.pending.test.tsx`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.motion.pending.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.motion.pending.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.motion.pending.test.tsx`
- `frontend/src/domains/monitor/components/SqlEditor/SqlEditor.motion.pending.test.tsx`
- `frontend/src/domains/wall/components/AcknowledgeButton/AcknowledgeButton.motion.pending.test.tsx`
- `frontend/src/domains/wall/components/AlsoActive/AlsoActive.motion.pending.test.tsx`
- `frontend/src/domains/wall/components/Hero/Hero.motion.pending.test.tsx`
- `frontend/src/domains/wall/components/HeroCalm/HeroCalm.motion.pending.test.tsx`
- `frontend/src/domains/wall/components/MonitorMatrix/MonitorMatrix.motion.pending.test.tsx`
- `frontend/src/domains/wall/components/NearLimit/NearLimit.motion.pending.test.tsx`
- `frontend/src/domains/wall/components/Timeline/Timeline.motion.pending.test.tsx`
- `frontend/src/domains/wall/components/WallHeader/WallHeader.motion.pending.test.tsx`
- `frontend/src/domains/wall/components/WallScreen/WallScreen.motion.pending.test.tsx`
- `frontend/src/domains/workspace/GroupList/GroupList.motion.pending.test.tsx`
- `frontend/src/shared/motion/presets.pending.test.ts`
- `frontend/src/shared/motion/tokens.pending.test.ts`
- `frontend/src/shared/motion/useValueFlash.pending.test.tsx`
- `frontend/src/shared/ui/Badge/Badge.motion.pending.test.tsx`
- `frontend/src/shared/ui/Button/Button.motion.pending.test.tsx`
- `frontend/src/shared/ui/Panel/Panel.motion.pending.test.tsx`
- `frontend/src/shared/ui/Sparkline/Sparkline.motion.pending.test.tsx`
- `frontend/src/shared/ui/StatusPill/StatusPill.motion.pending.test.tsx`
- `frontend/src/shared/ui/ThresholdChart/ThresholdChart.motion.pending.test.tsx`

## Decisions and notes
- Only `opacity`, `transform` and colors are animated; no springs; translate ≤ 8 px; numbers never count.
- Test contract: animated roots expose `data-motion-level`; enter = inline `opacity: 0` at mount (static when `off`); exits always go through `AnimatePresence`; status pills cross-fade their label and the dot pulses once (`data-pulse="once"`); value changes set `data-flash="up|down"` for 600 ms; list items carry `data-motion="listItem"`/`"reorder"`.
- Helpers for tests live in `@/test/motion` (`renderWithMotion`, `flushMotion`, `entersAnimated`, `isStatic`).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests for tokens, presets, value flash and every existing component (status: tests-pending).
