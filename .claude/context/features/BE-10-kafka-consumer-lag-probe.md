---
id: BE-10
title: "Kafka consumer lag probe"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-10 · Kafka consumer lag probe

## Summary
Lag per group/topic as a series

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/kafka/KafkaLagProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/kafka/KafkaLagProbeTest.java`

## Decisions and notes
- Offsets port (AdminClient); lag = end - committed per partition, summed; uncommitted partitions count fully.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
