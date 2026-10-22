---
id: FE-33
title: "SQL editor"
area: frontend
group: "Console productivity"
status: in-progress
screens: [monitor-editor-sql]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-33 · SQL editor

## Summary
Highlighting, catalog autocomplete, format, visible guard chips

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[monitor-editor-sql](../screens/monitor-editor-sql.md)

## Code
- `frontend/src/domains/monitor/components/SqlCodeEditor/SqlCodeEditor.tsx`
- `frontend/src/domains/monitor/components/SqlCodeEditor/sqlTokens.ts`
- `frontend/src/domains/monitor/components/MonitorForm/TargetFields.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/useCatalog.ts`
- `frontend/src/shared/api/consoleEndpoints.ts`

## Tests
- `frontend/src/domains/monitor/components/SqlCodeEditor/SqlCodeEditor.test.tsx`
- `frontend/src/domains/monitor/components/SqlCodeEditor/SqlCodeEditor.safeMode.test.tsx`
- `frontend/src/domains/monitor/components/SqlCodeEditor/SqlCodeEditor.safeMode.motion.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/TargetFields.kinds.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/MonitorForm.kinds.test.tsx`

## Decisions and notes
- Highlighting is a token layer under a transparent textarea; Ctrl+Space suggests catalog tables after FROM/JOIN and columns elsewhere; Format uppercases keywords and breaks main clauses; guard chips and safe-mode errors match `SqlEditor`.
- The monitor form uses `SqlCodeEditor`; the old `SqlEditor` was removed and its tests (guards, pt-BR, safe-mode error, FE-51 motion) were ported to `SqlCodeEditor.safeMode*.test.tsx`.
- Catalog: choosing a connection calls `GET /api/connections/{id}/catalog` (BE-13 `TableInfo[]`: schema, name, columns[name,type]); only names reach the editor; a failure shows "Table suggestions are unavailable" and the editor keeps working.
- Remaining: the backend has `CatalogIntrospector` but no controller route for `/api/connections/{id}/catalog` yet (be-runtime); done once it answers.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — SQL code editor component (status: in-progress).
- 2026-10-22 — SqlCodeEditor replaces SqlEditor in the monitor form with catalog loading per connection (status: in-progress until the catalog route exists).
