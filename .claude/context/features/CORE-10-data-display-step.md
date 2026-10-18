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
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.test.tsx`
- `frontend/src/domains/monitor/components/PreviewTable/PreviewTable.test.tsx`

## Decisions and notes
- Read mode suggested from the preview shape (single value, indicator card, ranking, time series, table, row count).
- Each field: store checkbox, label, format, unit, store as series, display mode; unchecked fields are not stored.
- Pending: PCI/LGPD badges and masking rules (CORE-16), JSON tree for HTTP (FE-35).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — suggestion rules, preview table and field list in en/pt-BR (status: in-progress).
