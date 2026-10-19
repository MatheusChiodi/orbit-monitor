---
id: BE-46
title: "Audit query API"
area: backend
group: "Security and platform"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
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
- `backend/orbit-api/src/main/java/io/orbit/api/web/AuditController.java`

## Tests
- `backend/orbit-security/src/test/java/io/orbit/security/audit/AuditLogTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/AccessAndGroupsApiTest.java`

## Decisions and notes
- `GET /api/audit?action=<prefix>&target=&operator=` over the in-memory window, newest first; entries are masked and never contain probe results.
- Pending: pagination and time range filters.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — audit query endpoint.
