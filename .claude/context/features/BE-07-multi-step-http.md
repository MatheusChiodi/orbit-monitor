---
id: BE-07
title: "Multi-step HTTP"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-07 · Multi-step HTTP

## Summary
Ordered steps with extracted variables (login → call API)

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/multistep/MultiStepHttpProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/multistep/MultiStepHttpProbeTest.java`

## Decisions and notes
- Steps extract JSONPath variables used as `${step.var}`; stops at the first failing step; unknown variables fail the step.
- JSONPath through Jayway json-path, already used by `HttpEvaluationContext`; every hop still goes through `HttpProbe` and so through the SSRF guard.
- Extracted values can be secrets (tokens): they live only in memory for one execution and error messages carry variable names, never values.
- A step fails on a network/SSRF error, an unknown `${step.var}` (before any request is sent) or a JSONPath that finds nothing; `totalMs` sums each step's response time. Default step timeout 10 s.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented ordered steps with JSONPath variables, fail-fast and no secret values in errors (status: done).
