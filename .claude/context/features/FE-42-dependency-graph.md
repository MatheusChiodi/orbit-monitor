---
id: FE-42
title: "Dependency graph"
area: frontend
group: "Console productivity"
status: done
screens: [dependency-graph]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-42 · Dependency graph

## Summary
Interactive graph with impact radius highlight

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[dependency-graph](../screens/dependency-graph.md)

## Code
- `frontend/src/domains/workspace/DependencyGraph/DependencyGraph.tsx`
- `frontend/src/domains/workspace/DependencyGraph/graph.ts`
- `frontend/src/app/console/screens/DependenciesScreen/DependenciesScreen.tsx`
- `frontend/src/app/console/screens/DependenciesScreen/dependencyNodes.ts`

## Tests
- `frontend/src/domains/workspace/DependencyGraph/DependencyGraph.test.tsx`
- `frontend/src/app/console/screens/DependenciesScreen/dependencyNodes.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`

## Decisions and notes
- Columns follow each node's longest upstream path; impact radius is breadth-first (cycle-safe) and announced in a status line; labels via `safeText`.
- Route `#/dependencies`: nodes are the groups/monitors named in the dependency items (group state = worst member), editors add (`upstream` → `downstream`) and remove links; a link that closes a cycle is refused before saving (BE-30 rejects it too).
- Verified against BE-30 (developer a9b7741): `GET /api/dependencies` is the item list `{id, upstream, downstream, note}`, `PUT|DELETE /api/dependencies/{id}`; cycles are also rejected by the backend.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — dependency graph component (status: in-progress).
- 2026-10-22 — `#/dependencies` screen with add/remove wired to the assumed `/api/dependencies` contract (status: in-progress until the endpoint exists).
- 2026-10-22 — wired to the BE-30 dependency API (status: done).
