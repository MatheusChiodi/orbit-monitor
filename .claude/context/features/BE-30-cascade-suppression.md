---
id: BE-30
title: "Cascade suppression"
area: backend
group: "Alerting"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-30 · Cascade suppression

## Summary
Dependency graph collapses downstream alerts into one incident

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/DependencyGraph.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/DependencyGraphTest.java`

## Decisions and notes
- Graph from orbit.dependencies.json; cycles rejected; root causes = down nodes without a down upstream.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
