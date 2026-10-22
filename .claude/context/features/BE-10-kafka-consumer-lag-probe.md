---
id: BE-10
title: "Kafka consumer lag probe"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-10 · Kafka consumer lag probe

## Summary
Lag per group/topic as a series

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/kafka/KafkaLagProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/kafka/KafkaLagProbeTest.java`

## Decisions and notes
- Offsets port (AdminClient); lag = end - committed per partition, summed; uncommitted partitions count fully.
- Offsets port (Kafka AdminClient `listOffsets` + `listConsumerGroupOffsets` in production) keeps kafka-clients out of this module.
- Lag never goes negative (commit ahead of end offset counts as 0); broker errors are returned in `error`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented consumer lag per partition and total with reported broker errors (status: done).
