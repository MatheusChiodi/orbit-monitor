---
id: FE-34
title: "Condition builder"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-editor-http, monitor-editor-sql]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-34 · Condition builder

## Summary
Visual and text modes kept in sync; "would fail now" against the preview

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-editor-http](../screens/monitor-editor-http.md), [monitor-editor-sql](../screens/monitor-editor-sql.md)

## Code
- `frontend/src/domains/monitor/components/ConditionBuilder/ConditionBuilder.tsx`
- `frontend/src/domains/monitor/conditions/conditionText.ts`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.tsx`

## Tests
- `frontend/src/domains/monitor/components/ConditionBuilder/ConditionBuilder.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.kinds.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.test.tsx`

## Decisions and notes
- Visual and Text tabs stay in sync; text mode is one `<condition> → LEVEL` per line; invalid text keeps the last valid conditions and shows "Line N: …"; both modes show what would fail now.
- The monitor form's Conditions section is the builder (visual rows = `ConditionEditor`, text tab); kinds without a preview get the probe placeholders (`conditionFieldsFor`) as fields.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — condition builder component (status: in-progress).
- 2026-10-22 — condition builder used in the monitor form (status: done).
