---
id: BE-45
title: "Operator identity (retired: client kind)"
area: backend
group: "Security and platform"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-45 · Operator identity (retired)

## Summary
Retired 2026-10-22 (product decision): no self-declared name. Acknowledgements, comments, tickets and audit record the client kind (`loopback` | `lan` | `unknown`); the anonymization endpoint stays for names stored by older versions.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/IncidentService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/Actors.java`
- `backend/orbit-common/src/main/java/io/orbit/common/OperatorName.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/Incident.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/AuditController.java`

- `frontend/src/shared/ui/ActorLabel/ActorLabel.tsx`, `frontend/src/shared/ui/ActorLabel/actor.ts`

## Tests
- `frontend/src/shared/ui/ActorLabel/ActorLabel.test.tsx`
- `frontend/e2e/console-operator.spec.ts` (no name prompt, no `X-Orbit-Operator` from console or wall)
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentAnonymizationTest.java`
- `backend/orbit-common/src/test/java/io/orbit/common/OperatorNameTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/IncidentApiTest.java`

## Decisions and notes
- 2026-10-22 — retired. Backend: `X-Orbit-Operator` is no longer read nor required and the `operator-required` problem is gone; `Actors.current()` records the client kind (`loopback`, `lan`, `unknown`) in `acknowledgedBy`, timeline actors, comment authors, `updatedBy` and the audit `operator` field. Older data may still hold names, so anonymization stays.
- 2026-10-22 — retired in the UI. No name prompt (`OperatorPrompt` and the `domains/security/operator` store deleted), no "Change name" button, no operator name in device preferences, no `?operator=` on the wall, no `X-Orbit-Operator` header and no `by` in incident request bodies. The console opens straight to the access check (workspace / ServerUnreachable / demo with `?demo`). `orbit.operator` is removed once on boot (`forgetLegacyOperator`).
- UI never presents an actor as a person: wall/hero/incident show "Acknowledged at HH:MM" / "Reconhecido às HH:MM"; the audit table (column and filter "Client"), incident timeline and comments and the SELECT history diff show `ActorLabel`: loopback → "This machine"/"Esta máquina", lan → "Local network"/"Rede local", unknown → "Unknown"/"Desconhecido"; any other legacy value is shown as-is through `SafeValue`.
- Superseded: every change needed `X-Orbit-Operator` (acknowledgement also accepted `by` in the body); missing name was `400 operator-required`.
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
- 2026-10-22 — retired: backend records the client kind instead of a name; frontend removes the name prompt, preference, `?operator=` and header, and labels actors by client kind.
