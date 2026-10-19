---
id: CORE-22
title: "30-day history store"
area: backend
group: "History"
status: done
screens: [wall, reports-sla, incident-detail]
spec: docs/08-logs-and-history.md
updated: 2026-10-18
---

# CORE-22 · 30-day history store

## Summary
Segmented append-only binary log (varint + delta), hourly zstd columnar blocks with sidecar indexes, 1m/1h rollups, 30-day retention with disk caps, crash recovery, benchmark (<150 MB for 200 monitors @30 s).

## Status
- [x] Tests written (pending or active)
- [x] Implemented (store module, wired into the app by BE-52)
- [x] All tests green, none pending

## Code
- `backend/orbit-history/pom.xml` (module registered in `backend/pom.xml`, profile `bench`)
- `backend/orbit-history/src/main/java/io/orbit/history/` — public records: `HistorySample`, `HistoryBucket`, `HistorySummary`, `HistoryCoverage`, `HistoryEvent`, `AuditRecord`, `HistoryHealth`, `HistorySettings`
- `.../history/codec/` — `Varint`, `ByteSink`, `FramedLog` (CRC32 frames, torn-tail truncation), `Compression` (zstd / Deflate), `CompressedFrame`, `FilePermissions`, `CorruptDataException`
- `.../history/segment/` — `Row`, `RowCodec` (hot WAL rows), `ColumnBlock` (closed columnar block), `SegmentIndex` (sidecar), `ValueCoding`
- `.../history/rollup/` — `Rollup`, `RollupCodec` (columnar, residual sums), `KeyedRollups` (per-key blocks), `LatencySketch` (DDSketch-style), `Resolution`
- `.../history/store/` — `HistoryStore` (facade), `HistoryWriter` (single writer thread), `SampleStream`, `SegmentStore`, `RollupStore`, `DayLog` (events/audit), `Retention`, `Dictionary`, `HistoryLayout`, `AtomicFiles`

## Tests
- `backend/orbit-history/src/test/java/io/orbit/history/codec/` — `VarintTest`, `CompressionTest`, `FramedLogTest`
- `.../segment/` — `RowCodecTest`, `ColumnBlockTest`
- `.../rollup/` — `RollupTest`, `LatencySketchTest`
- `.../store/` — `SampleStreamTest` (roll-over, crash mid-hour, torn tail, quarantine, low-disk, rollup rebuild, late rows, crash between segment write and WAL delete), `HistoryStoreTest`
- `.../bench/HistoryBenchmarkTest` — `@Tag("bench")`, run with `./mvnw -Pbench verify` (excluded from the default run)

## Decisions and notes
- **Compression: zstd-jni 1.5.7-24 (BSD-2), level 3, Deflate fallback.** zstd-jni bundles natives for win/linux/macOS x64+arm64 in one jar and is the de-facto JVM binding; Deflate (JDK, no dependency) is detected and used automatically when the native library cannot load, and every block records its codec id, so mixed stores decode. Rejected: Deflate-only (larger and slower to decode on these columns), LZ4 (faster but ~2× larger; size is the binding constraint).
- **Encoding: byte-aligned varint / zig-zag + delta-of-delta, then zstd — not Gorilla bit-packing.** Gorilla (Pelkonen et al., VLDB 2015) packs delta-of-delta timestamps and XOR floats at bit level; with an entropy coder (zstd) on top of column-grouped bytes the gain of bit packing is small and the code is far simpler and faster to decode. Integer-valued fields use zig-zag deltas; non-integer values fall back to raw float64 (no lossy float32).
- **Hot segment = row order per flush frame** (one CRC32 frame per 1 s / 64 KB batch, per-key deltas across frames); **closed segment = columnar per key** (times as delta-of-delta, flags, latencies, values, error codes), one compressed frame, written `.tmp` + rename and verified before the WAL is deleted. Late rows of an already closed hour go to the current hour's segment with their real timestamps (indexes carry min/max time); closing an hour whose segment exists merges and drops exact duplicates, which also makes a crash between "segment written" and "WAL deleted" idempotent.
- **Quantile sketch: own DDSketch-style log buckets (1% relative error), not t-digest.** `com.tdunning:t-digest` 3.3 is unreleased since 2021 and its merge is order-dependent; `com.datadoghq:sketches-java` 0.8.3 is maintained but its compact serialization needs protobuf. ~70 lines, deterministic merges, ~60–110 bytes per monitor-hour. Latency aggregates and percentiles cover OK/WARN only, matching `Statistics.latency` in orbit-telemetry.
- **Rollups are built when an hour closes** (not per minute) from that hour's rows and appended as one compressed frame per resolution to per-day files; the current hour is aggregated from memory on read. Rollups are per stream: `rollups/<stream>/<1m|1h>/<day>.seg`; the 1-hour file is per day (not per month as docs/08 sketches) so retention stays "delete whole days". Missing hours are rebuilt from raw segments on start. Rollup frames are per-key blocks (`KeyedRollups`) with columnar fields and residual sums (`sum − min − max − (n−2)·min`, zero for two-sample minutes): this took the 1-minute rollups from 116 MB to 20 MB per 30 days.
- **Events and audit** are small: one CRC-framed JSON record per frame, one file per UTC day (`events/<day>.log`), redacted again with `SensitiveDataRedactor.redactText` before writing.
- Days/hours are **UTC** on disk. Data dir is owner-only where POSIX permissions exist. Corrupt segments are renamed `.bad` and skipped; warnings are kept in `HistoryHealth` for a self-monitoring alert.
- **Benchmark (2026-10-18, Windows 11, JDK 21.0.9, zstd)** — 200 monitors @30 s, 29.5 days kept by the 30-day window (16.7 M records):
  - size **75.2 MB** (heartbeats 49.2, 1m rollups 20.1, 1h rollups 5.9) = 4.7 B/record; budget 150 MB
  - write **~297 k records/s** on the single writer thread including hourly compression and rollups (budget 50 k/s); probe enqueue p99.9 ≈ 1 µs (max ~35 ms = GC/safepoint outlier)
  - 30-day uptime + p95 query **52 ms cold / 30 ms warm** (budget 200 ms); 24-hour raw query **46 ms cold / 9 ms warm** (budget 100 ms)
  - crash (files copied from a live store, no close): **0 of 277 k** records older than 1.2 s lost (budget: at most the last 1 s flush window)
- Sources: https://github.com/luben/zstd-jni · https://www.vldb.org/pvldb/vol8/p1816-teller.pdf · https://github.com/DataDog/sketches-java · http://www.vldb.org/pvldb/vol12/p2195-masson.pdf · https://github.com/tdunning/t-digest

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — orbit-history module: binary WAL, columnar zstd segments, indexes, rollups, retention, crash recovery, benchmark (status: in-progress until BE-52 wires it into the app).
- 2026-10-18 — wired into orbit-api through the event bus (BE-52) (status: done).
