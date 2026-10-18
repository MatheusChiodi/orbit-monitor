---
id: CORE-10
title: "Data & display step"
area: frontend
group: "Monitor"
status: in-progress
screens: [data-and-display]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-10 · Data & display step

## Summary
Field selection, label, format, unit, series flag, display mode, where it appears.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md)

## Code
- `frontend/src/domains/monitor/display/display.ts`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.tsx`

## Tests
- `frontend/src/domains/monitor/display/display.test.ts`
- `frontend/src/domains/monitor/display/display.privacy.test.ts`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.test.tsx`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.privacy.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.privacy.test.tsx`

## Decisions and notes
- Read mode suggested from the preview shape (single value, indicator card, ranking, time series, table, row count).
- Each field: store checkbox, label, format, unit, store as series, display mode, masked and show-on-wall; unchecked fields are not stored.
- Privacy badges and rules from CORE-16 are in place; the JSON tree for HTTP (FE-35) and field reordering (FE-14) are pending.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — suggestion rules, preview table and field list in en/pt-BR (status: in-progress).
- 2026-10-18 — privacy badges, masked and show-on-wall controls (status: in-progress).
