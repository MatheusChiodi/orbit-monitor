---
id: CORE-03
title: "SQL probe and result payload"
area: backend
group: "Probe"
status: done
screens: [monitor-editor-sql, data-and-display]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-22
---

# CORE-03 · SQL probe and result payload

## Summary
Timeout, fetchSize, read-only user; ResultPayload {columns with types, rows, ms}; automatic read-mode suggestion.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-editor-sql](../screens/monitor-editor-sql.md), [data-and-display](../screens/data-and-display.md)

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/sql/SqlProbe.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/sql/SqlProbeOptions.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/ResultPayload.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/ColumnType.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/ReadModeSuggester.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/SqlEvaluationContext.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/ConnectionPools.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/CheckRunner.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/sql/SqlProbeTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/sql/ReadModeSuggesterTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/sql/SqlEvaluationContextTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeExtendedTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/privacy/CardDataLeakTest.java`

## Decisions and notes
- Every execution re-validates the SELECT, wraps it with `maxRows + 1` (the extra row flags `truncated`), sets `Connection.setReadOnly(true)`, `setQueryTimeout` (rounded up to whole seconds), `setFetchSize` and `setMaxRows`.
- JDBC values are normalized: `Timestamp` to `LocalDateTime`, `Date` to `LocalDate`, `Time` to `LocalTime`, `Clob` to `String`.
- Defaults: 500 rows, 30 s, fetch size 100.
- Wired: each connection has its own small pool (`ConnectionPools`, `poolSize` 1-3, evicted on edit/delete) and one query at a time per target (BE-15 `TargetLimiter`); `CheckRunner` evaluates conditions on the raw `ResultPayload` and returns only the redacted payload (probe boundary, CORE-16). Named parameters (BE-11) are bound with `setObject`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — SqlProbe with read-only connection, timeout, fetch size and truncation flag.
- 2026-10-22 — per-connection pool and probe-boundary redaction confirmed in the runtime; parameters bound (status: done).
