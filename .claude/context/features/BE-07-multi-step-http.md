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
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/HttpMonitorDef.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/HttpExtrasValidator.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/CheckRunner.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/MonitorRuntime.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/multistep/MultiStepHttpProbeTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/CheckRunnerExtendedTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ExtendedMonitorsApiTest.java`

## Decisions and notes
- Steps extract JSONPath variables used as `${step.var}`; stops at the first failing step; unknown variables fail the step.
- JSONPath through Jayway json-path, already used by `HttpEvaluationContext`; every hop still goes through `HttpProbe` and so through the SSRF guard.
- Extracted values can be secrets (tokens): they live only in memory for one execution and error messages carry variable names, never values.
- A step fails on a network/SSRF error, an unknown `${step.var}` (before any request is sent) or a JSONPath that finds nothing; `totalMs` sums each step's response time. Default step timeout 10 s.
- Wired 2026-10-22: `orbit.requests.json` `steps: [{name, method, url, headers, body, extract: {var: "$.path"}}]` (max 10, unique names); the monitored request runs last as step `main` and may use `${step.var}` in URL, headers and body. `CheckRunner.runSteps` evaluates the conditions on the last response; latency = sum of the steps; a failing step is DOWN with `Step 'login' failed: ...`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented ordered steps with JSONPath variables, fail-fast and no secret values in errors (status: done).
- 2026-10-22 — steps stored in orbit.requests.json, validated, exposed in POST /api/monitors and run by the runtime.
