---
screen: dependency-graph
title: "Dependency graph"
route: "index.html#/dependencies"
status: done
spec: FE-42, BE-30
updated: 2026-10-24
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
- `frontend/src/app/console/screens/DependenciesScreen/dependencyNodes.ts`

## Tests
- `frontend/src/app/console/screens/DependenciesScreen/dependencyNodes.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`
- `frontend/src/domains/workspace/DependencyGraph/DependencyGraph.test.tsx`

## Decisions and notes
- Redesign (FE-42): edges are drawn in an SVG overlay measured from the rendered nodes (re-measured on resize; impacted edges turn warn); selects use optgroups Groups/Monitors and leave out the built-in `SELF` health check (`dependencyOptions`); every dependency reads as a sentence ("If X goes down, alerts from Y are suppressed") with a remove icon button; the add form previews the sentence before saving. Node enter animation removed so edge anchors stay accurate.

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — screen routed and wired to the assumed `/api/dependencies` contract (status: in-progress).
- 2026-10-22 — verified against the BE-30 API (status: done).
- 2026-10-24 — redesign: SVG edges, optgroups without the self-check, one sentence per dependency.
