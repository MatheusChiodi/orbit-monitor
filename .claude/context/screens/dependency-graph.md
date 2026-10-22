---
screen: dependency-graph
title: "Dependency graph"
route: "index.html#/dependencies"
status: done
spec: FE-42, BE-30
updated: 2026-10-22
---

# Dependency graph

## Purpose
Interactive graph of groups/monitors with impact radius.

## Layout and components
`DependenciesScreen` (`/api/dependencies` query, add/remove panel for editors) → `DependencyGraph`.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [FE-42 · Dependency graph](../features/FE-42-dependency-graph.md) — done

## Code
- `frontend/src/app/console/screens/DependenciesScreen/DependenciesScreen.tsx`
- `frontend/src/domains/workspace/DependencyGraph/DependencyGraph.tsx`

## Tests
- `frontend/src/app/console/screens/DependenciesScreen/dependencyNodes.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — screen routed and wired to the assumed `/api/dependencies` contract (status: in-progress).
- 2026-10-22 — verified against the BE-30 API (status: done).
