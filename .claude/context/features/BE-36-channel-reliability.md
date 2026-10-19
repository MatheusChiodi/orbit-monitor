---
id: BE-36
title: "Channel reliability"
area: backend
group: "Alerting"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-36 · Channel reliability

## Summary
Rate limit per channel, retry with backoff, dead-letter queue

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/channel/ReliableSender.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/ReliableSenderTest.java`

## Decisions and notes
- Per-channel rate limit per minute, retries with exponential backoff, in-memory dead-letter queue.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
