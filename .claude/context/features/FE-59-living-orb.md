---
id: FE-59
title: "Living orb (system map)"
area: frontend
group: "Visual FX"
status: planned
screens: [wall, monitor-list]
spec: docs/03-design.md §4.2 (Living orb)
updated: 2026-10-18
---

# FE-59 · Living orb (system map)

## Summary
The 3D orb becomes a live map: core = overall health, one ring per group, one satellite per monitor (color = state, size = importance, speed ∝ check frequency), heartbeat ticks, near-threshold drift, DOWN stop + trail, maintenance hollow; hover tooltip, click to open, drag/zoom, keyboard navigation, legend, text summary; aggregation above 60 monitors; mini orb in the header.

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Code
_None yet._ Owner: fx-agent (`frontend/src/shared/fx/`).

## Tests
_None yet._

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: planned).
