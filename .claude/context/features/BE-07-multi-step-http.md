---
id: BE-07
title: "Multi-step HTTP"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-07 · Multi-step HTTP

## Summary
Ordered steps with extracted variables (login → call API)

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/multistep/MultiStepHttpProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/multistep/MultiStepHttpProbeTest.java`

## Decisions and notes
- Steps extract JSONPath variables used as `${step.var}`; stops at the first failing step; unknown variables fail the step.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
