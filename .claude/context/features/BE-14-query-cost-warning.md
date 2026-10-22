---
id: BE-14
title: "Query cost warning"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-14 · Query cost warning

## Summary
Preview time and `EXPLAIN` when supported; suggests a longer interval

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/QueryCostAdvisor.java`
- `backend/orbit-api/src/main/resources/messages.properties`
- `backend/orbit-api/src/main/resources/messages_pt_BR.properties`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/sql/QueryCostAdvisorTest.java`

## Decisions and notes
- NONE < 1 s; WARN suggests interval >= 60x preview time; HEAVY >= 10 s suggests >= 15 min and a view. EXPLAIN is a follow-up.
- Suggested interval = max(current, ceil(60 x preview)); HEAVY floors it at 900 s; capped at 24 h. Keys `sql.cost.none|warn|heavy` (en + pt-BR, `{0}` = suggested seconds).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented the query cost advisor (status: done).
