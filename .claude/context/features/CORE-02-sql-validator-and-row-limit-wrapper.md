---
id: CORE-02
title: "SQL validator and row-limit wrapper"
area: backend
group: "Monitor"
status: done
screens: [monitor-editor-sql]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-02 · SQL validator and row-limit wrapper

## Summary
JSqlParser: only SELECT/WITH, single statement, no DML/DDL/CALL/EXEC, blocklist DBMS_*, UTL_*, pg_sleep, xp_cmdshell; dialect-specific limit wrapper.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-editor-sql](../screens/monitor-editor-sql.md)

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/SelectValidator.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/SqlText.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/LimitWrapper.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/Dialect.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/sql/SelectValidatorTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/sql/LimitWrapperTest.java`

## Decisions and notes
- Defense in depth: JSqlParser tree checks (single `Select`, no data-modifying CTE, no `FOR UPDATE`, no `INTO`) plus a textual keyword/function blocklist on the SQL stripped of literals, quoted identifiers and comments.
- SQL Server cannot wrap a CTE in a derived table, so a `WITH` query is left unwrapped there and the executor's `setMaxRows` enforces the limit.
- Validation messages are English; stable error codes come with BE-49.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — validator, dialect detection and limit wrapper implemented (status: done).
