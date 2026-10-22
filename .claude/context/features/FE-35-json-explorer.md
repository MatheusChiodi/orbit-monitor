---
id: FE-35
title: "JSON explorer"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-editor-http]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-35 · JSON explorer

## Summary
Click a node to create a JSONPath field

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-editor-http](../screens/monitor-editor-http.md)

## Code
- `frontend/src/domains/monitor/components/JsonExplorer/JsonExplorer.tsx`
- `frontend/src/domains/monitor/components/JsonExplorer/jsonPath.ts`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.tsx`
- `frontend/src/domains/monitor/display/display.ts`

## Tests
- `frontend/src/domains/monitor/components/JsonExplorer/JsonExplorer.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.kinds.test.tsx`
- `frontend/src/domains/monitor/display/display.pick.test.ts`

## Decisions and notes
- ARIA tree (arrows move/expand, Enter picks a JSONPath field); arrays of objects expose `[*]`; every value through `SafeValue`, PCI fields get "PCI · masked" and cannot be picked; copy copies the masked text.
- Integrated in Data & display for HTTP: the preview's masked `body` (backend `PreviewResult.body`) is parsed when it is JSON; picking a node calls `addPickedField`, which re-selects an existing field or adds one through the same sensitive-data rules as the preview columns.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — JSON explorer component (status: in-progress).
- 2026-10-22 — JSON explorer in the HTTP preview of Data & display (status: done).
