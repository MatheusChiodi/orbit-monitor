---
id: CORE-09
title: "Realtime wall updates"
area: full-stack
group: "Realtime"
status: in-progress
screens: [wall]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-22
---

# CORE-09 · Realtime wall updates

## Summary
WebSocket `/ws/wall` feeding a Zustand store; no polling.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md)

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallSocketHandler.java`
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallPublisher.java`
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallViewFactory.java`
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallViews.java`
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallTimeline.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/WallSocketConfig.java`
- `frontend/src/shared/api/wallSocket.ts`
- `frontend/src/domains/wall/store/wallStore.ts`
- `frontend/src/domains/wall/feed/wallFeed.ts`
- `frontend/src/domains/wall/WallApp/WallApp.tsx`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallSocketTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallPublisherTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallViewFactoryTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallTimelineTest.java`
- `frontend/src/shared/api/wallSocket.test.ts`
- `frontend/src/domains/wall/store/wallStore.test.ts`
- `frontend/src/domains/wall/feed/wallFeed.test.ts`
- `frontend/src/domains/wall/WallApp/WallApp.test.tsx`

## Decisions and notes
- Backend: `/ws/wall` sends `{type: snapshot, seq, payload: WallSnapshot}` on connect, then `monitor` (after every check), `event` (confirmed state changes and acknowledgements) and `incident` deltas; `seq` increases per message.
- Backend: Payloads follow `frontend/src/shared/api/types.ts`; `status` may also be `UNKNOWN` (no check finished yet). `series` is the last 60 minutes of the primary value with null gaps; `impact` is the monitor's group name.
- Backend: Only configured origins may connect (`orbit.wall.allowed-origins`, default localhost/127.0.0.1 any port) to block cross-site WebSocket hijacking; the channel is read-only.
- Frontend: `/ws/wall?layout=<slug>` with messages `snapshot | monitor | incident | event`; unknown or malformed messages are dropped.
- Frontend: Reconnects with exponential backoff (1 s doubling, max 30 s); the store reducer is pure (`applyMessage`).
- Frontend: Without a backend the wall loads a deterministic demo snapshot and acknowledges locally.
- Frontend: No wall token: the layout comes from `?layout=<slug>` or the path `/wall/<slug>` (default `noc`).
- Frontend (resume, assumed BE-38 contract): every message may carry `seq`; the feed keeps the last one and every (re)connect opens `/ws/wall?layout=<slug>&since=<seq>`, so the server can replay only the missed deltas (or send a fresh `snapshot`). Messages with `seq` ≤ the last one are dropped (replays); a jump (`seq` > last + 1) reloads `GET /api/wall/snapshot`. Messages without `seq` are applied as before.
- Remaining (backend, be-runtime): honor `since` with a replay buffer. Today the handler's counter is shared by all clients and each new client's snapshot increments it, so other walls see a gap and reload the snapshot over REST (correct, but extra requests).

## Changelog
- 2026-10-18 — context file created (status: in-progress).
- 2026-10-18 — backend: WebSocket /ws/wall with snapshot + deltas and sequence numbers.
- 2026-10-18 — frontend: WebSocket client, Zustand store and feed with demo fallback.
- 2026-10-22 — frontend: `?layout=`, sequence tracking, `since=` on reconnect, gap → snapshot reload.
