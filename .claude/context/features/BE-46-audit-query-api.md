---
id: BE-46
title: "Audit query API"
area: backend
group: "Security and platform"
status: in-progress
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
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-security/src/main/java/io/orbit/security/audit/AuditLog.java`
- `backend/orbit-security/src/main/java/io/orbit/security/audit/TextDiff.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/AuditController.java`

## Tests
- `backend/orbit-security/src/test/java/io/orbit/security/audit/AuditLogTest.java`
- `backend/orbit-security/src/test/java/io/orbit/security/audit/TextDiffTest.java`

## Decisions and notes
- `GET /api/audit?action=<prefix>&target=&operator=` over the in-memory window, newest first; entries are masked and never contain probe results.
- Pending: pagination and time range filters.
- `TextDiff.of` is an LCS line diff after trimming the common prefix/suffix; removed lines come before added ones; null is empty text. Above 4M line pairs it falls back to the whole changed block as -/+. Alternative considered: java-diff-utils (Apache-2.0, extra dependency for a two-function need).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — audit query endpoint.
- 2026-10-18 — pending test for the SELECT change diff.
- 2026-10-22 — implemented the SELECT change diff (TextDiff); pagination and time range still pending.
