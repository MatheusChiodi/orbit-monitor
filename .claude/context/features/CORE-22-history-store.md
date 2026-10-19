---
id: CORE-22
title: "30-day history store"
area: backend
group: "History"
status: planned
screens: [wall, reports-sla, incident-detail]
spec: docs/08-logs-and-history.md
updated: 2026-10-18
---

# CORE-22 · 30-day history store

## Summary
Segmented append-only binary log (varint + delta), hourly zstd columnar blocks with sidecar indexes, 1m/1h rollups, 30-day retention with disk caps, crash recovery, benchmark (<150 MB for 200 monitors @30 s).

## Status
- [ ] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Code
_None yet._

## Tests
_None yet._

## Decisions and notes
_None yet._

## Changelog
- 2026-10-18 — context file created (status: planned).
