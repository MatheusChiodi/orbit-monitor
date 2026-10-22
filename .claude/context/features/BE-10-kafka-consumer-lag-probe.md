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
- `backend/orbit-probe/src/main/java/io/orbit/probe/kafka/AdminOffsetSource.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/KafkaSources.java`
- `backend/orbit-probe/pom.xml`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/kafka/KafkaLagProbeTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/kafka/AdminOffsetSourceTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ExtendedMonitorsApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/HistoryRecorderTest.java`

## Decisions and notes
- Offsets port (AdminClient); lag = end - committed per partition, summed; uncommitted partitions count fully.
- Offsets port (`KafkaLagProbe.OffsetSource`); the production adapter is `AdminOffsetSource` (Kafka Admin API).
- Lag never goes negative (commit ahead of end offset counts as 0); broker errors are returned in `error`.
- Wired 2026-10-22: check type `KAFKA` with `probe: {bootstrapServers, consumerGroup, topic}`; values `LAG`, `PARTITIONS`, `MAX_PARTITION_LAG` for conditions (`[COL].LAG < 1000`) and kept as series in the history (`monitorId/LAG`).
- Decision: `kafka-clients` Admin API (Apache-2.0, version managed by Spring Boot, 3.8.1): `describeTopics` + `listOffsets(latest)` + `listConsumerGroupOffsets`; it never joins the group, so no rebalance. `lz4-java` and `snappy-java` are excluded (the Admin API never decompresses records; also avoids the lz4-java 1.8.0 advisory). Rejected: implementing the Kafka wire protocol by hand (ListOffsets/OffsetFetch versions, metadata, SASL) and a consumer with `committed()` (joins/affects the group). One Admin client per bootstrap list, closed when no monitor uses it.
- Bootstrap hosts pass the SSRF guard; broker addresses advertised by Kafka are used as returned (documented gap). SASL/TLS client settings are not supported yet. Tested with a mocked `Admin`; no real broker in CI.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented consumer lag per partition and total with reported broker errors (status: done).
- 2026-10-22 — Kafka Admin offsets source wired into the runtime, API and series history.
