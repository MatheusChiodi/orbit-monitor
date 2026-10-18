---
id: CORE-02
title: "SQL validator and row-limit wrapper"
area: backend
group: "Monitor"
status: planned
screens: [monitor-editor-sql]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-02 · SQL validator and row-limit wrapper

## Summary
JSqlParser: only SELECT/WITH, single statement, no DML/DDL/CALL/EXEC, blocklist DBMS_*, UTL_*, pg_sleep, xp_cmdshell; dialect-specific limit wrapper.

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[monitor-editor-sql](../screens/monitor-editor-sql.md)

## Code
_None yet._

## Tests
_None yet._

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: planned).
