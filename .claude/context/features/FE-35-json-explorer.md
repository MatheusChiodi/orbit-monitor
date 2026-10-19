---
id: FE-35
title: "JSON explorer"
area: frontend
group: "Console productivity"
status: in-progress
screens: [monitor-editor-http]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-35 · JSON explorer

## Summary
Click a node to create a JSONPath field

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[monitor-editor-http](../screens/monitor-editor-http.md)

## Code
- `frontend/src/domains/monitor/components/JsonExplorer/JsonExplorer.tsx`
- `frontend/src/domains/monitor/components/JsonExplorer/jsonPath.ts`

## Tests
- `frontend/src/domains/monitor/components/JsonExplorer/JsonExplorer.test.tsx`

## Decisions and notes
- ARIA tree (arrows move/expand, Enter picks a JSONPath field); arrays of objects expose `[*]`; every value through `SafeValue`, PCI fields get "PCI · masked" and cannot be picked; copy copies the masked text.
- Pending: HTTP preview integration in the Data & display step.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — JSON explorer component (status: in-progress).
