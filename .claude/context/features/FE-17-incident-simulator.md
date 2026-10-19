---
id: FE-17
title: "Incident simulator"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-17 · Incident simulator

## Summary
"What if" mode shows how the wall reacts to a fake incident

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/workspace/layout/simulator.ts`
- `frontend/src/domains/workspace/IncidentSimulator/IncidentSimulator.tsx`
- `frontend/src/shared/api/types.ts`

## Tests
- `frontend/src/domains/workspace/layout/simulator.test.ts`
- `frontend/src/domains/workspace/IncidentSimulator/IncidentSimulator.test.tsx`

## Decisions and notes
- `simulateIncident` returns a copy flagged `simulated` with an unowned `sim-<id>` incident; the preview renders `WallScreen` in mock mode with a no-op Acknowledge and the note "Simulation: nothing is real and no alert is sent"; no network calls.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — incident simulator (status: done).
