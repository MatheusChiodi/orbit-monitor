---
id: BE-27
title: "Escalation policies"
area: backend
group: "Alerting"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-27 · Escalation policies

## Summary
Timed steps, stop on acknowledge

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/escalation/EscalationPolicy.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/escalation/EscalationPolicyTest.java`

## Decisions and notes
- Steps `after` the incident opened, each to channel ids; stop on acknowledge; `nextEscalationAt` feeds the wall countdown (`escalatesAt`). Stored in orbit.escalation.json.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
