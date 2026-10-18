---
id: CORE-09
title: "Realtime wall updates"
area: full-stack
group: "Realtime"
status: in-progress
screens: [wall]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
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

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallSocketTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallPublisherTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallViewFactoryTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/wall/WallTimelineTest.java`

## Decisions and notes
- Backend: `/ws/wall` sends `{type: snapshot, seq, payload: WallSnapshot}` on connect, then `monitor` (after every check), `event` (confirmed state changes and acknowledgements) and `incident` deltas; `seq` increases per message.
- Backend: Payloads follow `frontend/src/shared/api/types.ts`; `status` may also be `UNKNOWN` (no check finished yet). `series` is the last 60 minutes of the primary value with null gaps; `impact` is the monitor's group name.
- Backend: Only configured origins may connect (`orbit.wall.allowed-origins`, default localhost/127.0.0.1 any port) to block cross-site WebSocket hijacking; the channel is read-only.

## Changelog
- 2026-10-18 — context file created (status: in-progress).
- 2026-10-18 — backend: WebSocket /ws/wall with snapshot + deltas and sequence numbers.
