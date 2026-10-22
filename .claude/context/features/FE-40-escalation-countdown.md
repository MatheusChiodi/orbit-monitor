---
id: FE-40
title: "Escalation countdown"
area: frontend
group: "Console productivity"
status: done
screens: [wall, incident-detail]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-40 · Escalation countdown

## Summary
"Escalates in 08:12" widget on the wall and console

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md), [incident-detail](../screens/incident-detail.md)

## Code
- `frontend/src/domains/alerting/EscalationCountdown/EscalationCountdown.tsx`
- `frontend/src/domains/wall/components/Hero/Hero.tsx`
- `frontend/src/domains/alerting/escalation/escalationApi.ts`
- `frontend/src/domains/wall/components/WallScreen/WallScreen.tsx`
- `frontend/src/app/wall-main.tsx`

## Tests
- `frontend/src/domains/alerting/EscalationCountdown/EscalationCountdown.test.tsx`
- `frontend/src/domains/wall/components/Hero/Hero.test.tsx`
- `frontend/src/domains/alerting/escalation/escalationApi.test.ts`
- `frontend/src/domains/wall/WallApp/WallApp.layout.test.tsx`

## Decisions and notes
- `role=timer` with `aria-live=off` (no per-second announcements); `mm:ss` below one hour, amber in the last minute; hidden once acknowledged; "Escalated to …" after the deadline.
- Used by the wall hero; the console incident page is FE-39.
- Next-step name: `useNextEscalationStep` prefers `nextStepName` on the wall incident (WS snapshot, added by be-runtime) and otherwise asks `GET /api/incidents/{id}/escalation` (BE-27: `{ incidentId, policyName, nextStep: { index, name, at } | null }`, 204/404 = no further step) once per incident and deadline; acknowledged incidents never fetch. Failures leave the countdown without a name.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — escalation countdown on the wall hero (status: in-progress).
- 2026-10-18 — escalation countdown on the wall hero (status: in-progress).
- 2026-10-18 — escalation countdown on the wall hero (status: in-progress).
- 2026-10-22 — next-step name from the wall payload or the escalation API (status: done).
