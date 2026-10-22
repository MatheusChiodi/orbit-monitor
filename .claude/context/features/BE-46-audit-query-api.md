---
id: BE-46
title: "Audit query API"
area: backend
group: "Security and platform"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-46 · Audit query API

## Summary
Filters, SELECT change diff, never stores probe results

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-security/src/main/java/io/orbit/security/audit/AuditLog.java`
- `backend/orbit-security/src/main/java/io/orbit/security/audit/AuditQuery.java`
- `backend/orbit-security/src/main/java/io/orbit/security/audit/TextDiff.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/AuditController.java`

## Tests
- `backend/orbit-security/src/test/java/io/orbit/security/audit/AuditLogTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/audit/AuditPagingTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/audit/TextDiffTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AuditAndConfigApiTest.java`

## API
`GET /api/audit?action=<prefix>&target=<id>&operator=<substring>&from=<ISO instant>&to=<ISO instant>&offset=0&limit=100`
→ `AuditEntry[]` newest first (`{ at, operator, action, target, detail, remoteAddress }`), header `X-Total-Count` = number of matching entries. `from` inclusive, `to` exclusive; `limit` capped at 500; a malformed instant or `to < from` → 400 `bad-request`.

## Decisions and notes
- Entries are masked when recorded and never contain probe results (only the query that ran, the names and kinds of what changed).
- Pagination is offset/limit with the total in `X-Total-Count`, keeping the JSON array body so existing consumers (and tests) keep working; a cursor was not needed for an in-memory 24 h window.
- `TextDiff.of` is an LCS line diff after trimming the common prefix/suffix; removed lines come before added ones; null is empty text. Above 4M line pairs it falls back to the whole changed block as -/+. Alternative considered: java-diff-utils (Apache-2.0, extra dependency for a two-function need).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — audit query endpoint.
- 2026-10-18 — pending test for the SELECT change diff.
- 2026-10-22 — implemented the SELECT change diff (TextDiff); pagination and time range still pending.
- 2026-10-22 — time range (from/to), offset/limit pagination and X-Total-Count (status: done).
