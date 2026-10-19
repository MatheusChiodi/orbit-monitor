---
id: FE-40
title: "Escalation countdown"
area: frontend
group: "Console productivity"
status: in-progress
screens: [wall, incident-detail]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-40 · Escalation countdown

## Summary
"Escalates in 08:12" widget on the wall and console

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md), [incident-detail](../screens/incident-detail.md)

## Code
- `frontend/src/domains/alerting/EscalationCountdown/EscalationCountdown.tsx`
- `frontend/src/domains/wall/components/Hero/Hero.tsx`

## Tests
- `frontend/src/domains/alerting/EscalationCountdown/EscalationCountdown.test.tsx`
- `frontend/src/domains/wall/components/Hero/Hero.test.tsx`

## Decisions and notes
- `role=timer` with `aria-live=off` (no per-second announcements); `mm:ss` below one hour, amber in the last minute; hidden once acknowledged; "Escalated to …" after the deadline.
- Used by the wall hero; the next-step name comes with the escalation policy API (pending), the console incident page is FE-39.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — escalation countdown on the wall hero (status: in-progress).
- 2026-10-18 — escalation countdown on the wall hero (status: in-progress).
- 2026-10-18 — escalation countdown on the wall hero (status: in-progress).
