---
id: BE-36
title: "Channel reliability"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-36 · Channel reliability

## Summary
Rate limit per channel, retry with backoff, dead-letter queue

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/ReliableSender.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/ChannelController.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/ReliableSenderTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/ChannelDeliveryTest.java`

## Decisions and notes
- Per-channel rate limit per minute, retries with exponential backoff, in-memory dead-letter queue.
- Dead letters are exposed at `GET /api/channels/dead-letters` (`{channelId, error, attempts}`, error masked); the Telegram bot token is scrubbed from errors before they reach the queue.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — per-channel rate limit, retries with backoff and dead-letter queue implemented (status: done).
- 2026-10-22 — dead-letter endpoint; all channel types go through the reliable sender.
