---
id: FE-36
title: "Query history diff"
area: frontend
group: "Console productivity"
status: done
screens: [audit-log]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-36 · Query history diff

## Summary
Side-by-side diff of SELECT changes from the audit trail

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[audit-log](../screens/audit-log.md)

## Code
- `frontend/src/domains/monitor/components/QueryDiff/QueryDiff.tsx`
- `frontend/src/domains/monitor/components/QueryDiff/diffLines.ts`
- `frontend/src/app/console/screens/AuditScreen/AuditScreen.tsx`
- `frontend/src/app/console/screens/AuditScreen/queryChanges.ts`

## Tests
- `frontend/src/domains/monitor/components/QueryDiff/QueryDiff.test.tsx`
- `frontend/src/app/console/screens/AuditScreen/queryChanges.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`

## Decisions and notes
- Line diff by longest common subsequence (removals before additions, `<del>`/`<ins>`); both SELECT versions are redacted before diffing; authors are marked self-declared.
- Fed from `GET /api/audit?action=sql.save&target=<monitorId>` (BE-46): consecutive saves become before/after pairs (unchanged saves skipped), newest first; the client is derived from the audit remote address (loopback vs LAN). Route `#/audit` has action/target/operator filters and pages of 50 (`limit`/`offset`; the response may be an array or `{items, total}` while BE-46 pagination lands).
- BE-46 pagination: the body stays an array and the total comes in `X-Total-Count`, which drives the next-page button.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — query history diff component (status: in-progress).
- 2026-10-22 — query history diff fed from the audit API in the new `#/audit` screen (status: done).
- 2026-10-22 — audit total read from X-Total-Count.
