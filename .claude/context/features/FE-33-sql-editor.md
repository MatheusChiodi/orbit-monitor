---
id: FE-33
title: "SQL editor"
area: frontend
group: "Console productivity"
status: in-progress
screens: [monitor-editor-sql]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-33 · SQL editor

## Summary
Highlighting, catalog autocomplete, format, visible guard chips

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[monitor-editor-sql](../screens/monitor-editor-sql.md)

## Code
- `frontend/src/domains/monitor/components/SqlCodeEditor/SqlCodeEditor.tsx`
- `frontend/src/domains/monitor/components/SqlCodeEditor/sqlTokens.ts`

## Tests
- `frontend/src/domains/monitor/components/SqlCodeEditor/SqlCodeEditor.test.tsx`

## Decisions and notes
- Highlighting is a token layer under a transparent textarea; Ctrl+Space suggests catalog tables after FROM/JOIN and columns elsewhere; Format uppercases keywords and breaks main clauses; guard chips and safe-mode errors match `SqlEditor`.
- Pending: replace `SqlEditor` in the monitor form and load the catalog from the API (BE-13).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — SQL code editor component (status: in-progress).
