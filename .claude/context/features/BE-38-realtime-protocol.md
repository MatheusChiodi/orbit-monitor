---
id: BE-38
title: "Realtime protocol"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-38 · Realtime protocol

## Summary
WebSocket snapshot + deltas with sequence numbers; resume after reconnect

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallSocketHandler.java`
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallViews.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallSocketTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallResumeTest.java`

## Decisions and notes
- Snapshot on connect, then deltas with increasing `seq`; a client that sees a gap reloads `GET /api/wall/snapshot`.
- Resume (2026-10-22): every message carries `stream` (id of this server run). A client reconnecting to `/ws/wall?stream=<id>&since=<seq>` gets only the deltas after `seq`, in order, from a replay buffer of the last 1,000 deltas; an unknown stream (restart), a gap older than the buffer, a future seq or a malformed value gets a snapshot. Message: `{type, seq, stream, payload}`.
- A snapshot no longer consumes a sequence number: it is the state as of its `seq`, so connecting clients never create gaps for the others. It is built outside the lock; deltas published meanwhile are replayed after it (a client may re-apply a delta it already has, never miss one).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — snapshot + deltas with sequence numbers.
- 2026-10-22 — resume from a sequence number without a snapshot; snapshots no longer create gaps (status: done).
