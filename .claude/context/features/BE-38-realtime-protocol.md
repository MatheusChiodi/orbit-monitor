---
id: BE-38
title: "Realtime protocol"
area: backend
group: "Workspace and configuration"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-38 · Realtime protocol

## Summary
WebSocket snapshot + deltas with sequence numbers; resume after reconnect

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallSocketHandler.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallSocketTest.java`

## Decisions and notes
- Snapshot on connect, then deltas with increasing `seq`; a client that sees a gap reloads `GET /api/wall/snapshot`.
- Pending: resume from a sequence number without a full snapshot.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — snapshot + deltas with sequence numbers.
