---
id: FE-42
title: "Dependency graph"
area: frontend
group: "Console productivity"
status: in-progress
screens: [dependency-graph]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-42 · Dependency graph

## Summary
Interactive graph with impact radius highlight

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[dependency-graph](../screens/dependency-graph.md)

## Code
- `frontend/src/domains/workspace/DependencyGraph/DependencyGraph.tsx`
- `frontend/src/domains/workspace/DependencyGraph/graph.ts`

## Tests
- `frontend/src/domains/workspace/DependencyGraph/DependencyGraph.test.tsx`

## Decisions and notes
- Columns follow each node's longest upstream path; impact radius is breadth-first (cycle-safe) and announced in a status line; labels via `safeText`.
- Pending: `/api/dependencies` wiring and the screen route.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — dependency graph component (status: in-progress).
