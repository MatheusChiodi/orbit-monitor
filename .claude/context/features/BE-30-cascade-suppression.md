---
id: BE-30
title: "Cascade suppression"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-30 · Cascade suppression

## Summary
Dependency graph collapses downstream alerts into one incident

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/DependencyGraph.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/DependencyGraphTest.java`

## Decisions and notes
- Graph from orbit.dependencies.json; cycles rejected; root causes = down nodes without a down upstream.
- Adjacency maps both ways; `addDependency` rejects self-loops and edges whose upstream is already reachable from the downstream (BFS). Suppression follows direct upstream edges only, so a chain collapses while every link is down; `rootCauses` returns a sorted set. Thread-safe via synchronized methods.
- Alternative considered: JGraphT (cycle detector, topological order); not added because the graphs are small and BFS is enough.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — dependency graph, impact, root causes and cycle rejection implemented; pending tag removed (status: done).
