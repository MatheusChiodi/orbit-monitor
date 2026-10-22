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
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/Dependency.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/CascadeResolver.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/IncidentService.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/NotificationDispatcher.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/escalation/EscalationRunner.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/DependencyController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/AlertingBeans.java`
- `backend/orbit-config/src/main/resources/schemas/orbit.dependencies.schema.json`
- `backend/config-examples/orbit.dependencies.example.json`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/DependencyGraphTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/CascadeResolverTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentLifecycleTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/NotificationDispatcherTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/escalation/EscalationRunnerTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/DependencyApiTest.java`

## Decisions and notes
- Graph from orbit.dependencies.json; cycles rejected; root causes = down nodes without a down upstream.
- Adjacency maps both ways; `addDependency` rejects self-loops and edges whose upstream is already reachable from the downstream (BFS). Suppression follows direct upstream edges only, so a chain collapses while every link is down; `rootCauses` returns a sorted set. Thread-safe via synchronized methods.
- Alternative considered: JGraphT (cycle detector, topological order); not added because the graphs are small and BFS is enough.
- `orbit.dependencies.json` items `{id, upstream, downstream, note}` (monitor or group ids; downstream depends on upstream), schema-checked; the file validator rebuilds the graph so a cycle or self-loop is `422 invalid-config`. Owned by alerting here although docs/06 lists it under Workspace.
- Wiring: `CascadeResolver` (nodes of a monitor = its id and its group; a group upstream counts when any of its monitors has an open DOWN incident; chains resolve to the root) is plugged into `IncidentService.setUpstream`. A new incident whose upstream is down opens with `parentId` = the root incident and a `CORRELATED` event; the root gets `CORRELATED <downstream monitor>`. Child incidents send no notification and never escalate, so the blast radius is one alert.
- REST: `GET /api/dependencies` -> `[{id, upstream, downstream, note}]`; `PUT /api/dependencies/{id} {upstream, downstream, note?}`; `DELETE /api/dependencies/{id}` (204/404); `GET /api/dependencies/graph` -> `{nodes[{id, kind MONITOR|GROUP|UNKNOWN, name, status OK|WARN|DOWN|UNKNOWN}], edges[{id, upstream, downstream, note}], rootCauses[id]}` for the console graph (FE-42); `GET /api/dependencies/impact/{node}` -> `{node, impacted[id]}`. Mutations follow the access policy and are audited (`dependency.save|delete`).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — dependency graph, impact, root causes and cycle rejection implemented; pending tag removed (status: done).
- 2026-10-22 — orbit.dependencies.json store, /api/dependencies (graph, impact) and cascade of downstream incidents into the root incident (status: done).
