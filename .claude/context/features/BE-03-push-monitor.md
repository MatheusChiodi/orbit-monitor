---
id: BE-03
title: "Push monitor"
area: backend
group: "Probes"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-03 · Push monitor

## Summary
Generated URL with secret token; "no signal for X min" = down

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/push/PushRegistry.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/push/PushRegistryTest.java`

## Decisions and notes
- Secret URL-safe token per push monitor (rotating invalidates the old one); silence beyond maxSilence is DOWN.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — push registry with constant-time token check implemented; push endpoint pending.
