---
id: FE-17
title: "Incident simulator"
area: frontend
group: "Drag and drop and layout"
status: planned
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# FE-17 · Incident simulator

## Summary
"What if" mode shows how the wall reacts to a fake incident

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- Parked: `frontend/src/domains/workspace/IncidentSimulator/` was removed in the 2026-10-24 redesign (it was never mounted); recover it from commit `33110a0`.

## Tests
- None while parked.

## Decisions and notes
- 2026-10-24 redesign: parked. The component was only used by its own tests; it comes back when a screen needs it.
- `simulateIncident` returns a copy flagged `simulated` with an unowned `sim-<id>` incident; the preview renders `WallScreen` in mock mode with a no-op Acknowledge and the note "Simulation: nothing is real and no alert is sent"; no network calls.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — incident simulator (status: done).
- 2026-10-24 — parked: unused code removed in the console redesign (status: planned).
