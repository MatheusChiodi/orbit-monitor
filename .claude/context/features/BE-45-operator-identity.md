---
id: BE-45
title: "Operator identity"
area: backend
group: "Security and platform"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-45 · Operator identity

## Summary
Self-declared `X-Orbit-Operator` name recorded on acknowledgements, comments and audit; anonymization endpoint

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/IncidentService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/Operators.java`
- `backend/orbit-common/src/main/java/io/orbit/common/OperatorName.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/Incident.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/AuditController.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentAnonymizationTest.java`
- `backend/orbit-common/src/test/java/io/orbit/common/OperatorNameTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/IncidentApiTest.java`

## Decisions and notes
- Every change needs `X-Orbit-Operator` (acknowledgement also accepts `by` in the body); missing name is `400 operator-required`.
- `POST /api/operators/anonymize {name}` anonymizes the audit entries in memory and the incidents (see below).
- `IncidentService.anonymize(name)` normalizes the name like `OperatorName`, replaces it with `anonymized` (same marker as the audit log) in `acknowledgedBy` and in every timeline actor, re-publishes each changed incident and returns how many incidents changed.
- `POST /api/operators/anonymize {name}` now also calls `IncidentService.anonymize` and answers `{auditEntries, incidents}`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — operator header and audit anonymization endpoint.
- 2026-10-18 — X-Orbit-Operator is percent-decoded as UTF-8 (frontend sends encodeURIComponent).
- 2026-10-18 — pending test for anonymizing the operator name in incidents.
- 2026-10-22 — incident anonymization implemented in IncidentService; pending tag removed from IncidentAnonymizationTest (status: done).
- 2026-10-22 — anonymization endpoint also anonymizes incidents.
