# Orbit Monitor — Logs and History (30 days, large but light)

Orbit keeps **up to 30 days** of history on the operator's machine **without a database**: check results, metric series, state changes, incidents, the audit trail and application logs. Everything is written to compact, compressed, append-only files that are cheap to write, fast to query and purged automatically.

## 1. Sizing (why a naive log does not work)

Reference load: **200 monitors**, one check every **30 s**.

| | Per day | 30 days |
|---|---|---|
| Check results (heartbeats) | 576,000 | 17.3 million |
| Naive JSON Lines (~180 B each) | ~104 MB | **~3.1 GB** |
| Orbit binary records (~11 B avg, §3) | ~6.3 MB | ~190 MB |
| …compressed with zstd (~4–6× on these blocks) | ~1.2 MB | **~35–50 MB** |
| 1-minute rollups (200 × 1,440 × ~24 B) | ~7 MB raw → ~1.5 MB | ~45 MB |

Target: **< 150 MB on disk for 30 days at the reference load**, writes that never block probes, and 30-day charts that load in < 200 ms.

## 2. Streams

| Stream | Content | Granularity kept 30 days |
|---|---|---|
| `heartbeats` | One record per check: monitor, time, state, latency, primary value, error code | Raw |
| `series` | Values of fields marked *stored as series* (FE "Data & display") | Raw + 1-min + 1-hour rollups |
| `events` | State changes, incidents (open / ack / comment / resolve), maintenance, silences | Raw (small) |
| `audit` | Configuration changes (who, when, what, diff), preview executions (never the result) | Raw |
| `app` | Application log (Logback), structured JSON, masked | Raw, size-capped |

Never stored: SELECT result rows, HTTP bodies, headers, secrets or any field not explicitly selected. Values are already redacted at the probe boundary ([04-data-protection.md](04-data-protection.md)).

## 3. On-disk format

```
~/.orbit/data/
  heartbeats/2026-10-18/14.seg   one segment per stream per hour
  heartbeats/2026-10-18/14.idx   sidecar index
  series/…   events/…   audit/…
  rollups/1m/2026-10-18.seg      per-day rollup files
  rollups/1h/2026-10.seg         per-month rollup files
  dictionary.json                monitorId / fieldId ↔ small integer
  logs/orbit.log, orbit-2026-10-17.0.log.gz …   application log (Logback)
```

**Hot segment (current hour)** — append-only, crash-tolerant:
- Each record is a length-prefixed binary frame with a CRC32; a torn tail after a crash is detected and truncated on start.
- Fields are **varint / zig-zag encoded and delta-coded** against the previous record of the same monitor: time delta (usually 30 000 ms → 3 bytes), monitor index (1–2 bytes), state (1 byte, packed with flags), latency (varint, ~2 bytes), value (delta zig-zag or float32 when needed), error code (dictionary index, usually 0). Typical record: **8–14 bytes**.
- Writes go through a single writer thread fed by a lock-free queue; batches flush every 1 s or 64 KB, whichever comes first. Probes never wait on disk.

**Closed segment (on the hour)** — rewritten once into a compressed block:
- Records are regrouped **by monitor, column by column** (times, states, latencies, values), which compresses far better than row order.
- Compressed with **zstd** (level 3; `zstd-jni`), falling back to `java.util.zip` Deflate when native zstd is unavailable. Expected ratio on these columns: 4–8×.
- Writing is atomic (`.tmp` + rename); the hot segment is deleted only after the closed one is verified.

**Sidecar index (`.idx`)** — tiny, read first on every query:
min/max time, record count, per-monitor offsets and counts, per-monitor min/max/sum of latency and value, state counts. Most "how is it going" queries (uptime, counts, min/max) are answered from indexes and rollups without decompressing raw data.

## 4. Rollups

- **1-minute** aggregates per monitor/field: count, OK/WARN/DOWN counts, min, max, sum, sum of squares (mean/stddev) — about 24 bytes before compression.
- **1-hour** aggregates: the same plus a compact latency sketch (t-digest, ~100 bytes) for p50/p95/p99; 1-minute percentiles are computed from raw data when needed.
- Built incrementally in memory and appended when each minute/hour closes; rebuilt from raw segments on start if missing.
- Charts pick the resolution automatically: ≤ 6 h → raw, ≤ 7 d → 1-min, otherwise 1-hour.

## 5. Retention and limits

| Setting (`orbit.settings.json`) | Default |
|---|---|
| `history.retentionDays` | 30 (allowed 1–30) |
| `history.maxDiskMb` | 1024 — when exceeded, the oldest days are dropped first and a warning is shown |
| `history.minFreeDiskMb` | 512 — below this Orbit stops writing raw data, keeps rollups, and alerts |
| `logs.app.maxHistoryDays` / `totalSizeCap` | 30 days / 512 MB |

- A daily purge job deletes whole day directories older than the retention window (O(1) per day, no rewriting).
- The application log uses Logback `SizeAndTimeBasedRollingPolicy` (daily, 50 MB files, gzip, `maxHistory=30`, `totalSizeCap`), JSON encoder, and the masking converter of the privacy layer.

## 6. Reading

- `GET /api/history/{monitorId}?from&to&resolution=auto|raw|1m|1h` — streams results; time-range lookups use indexes to open only the needed segments.
- `GET /api/events?from&to&type&monitorId`, `GET /api/audit?from&to&actor&entity`.
- Recent data (last hour) is served from memory; older data from disk; the UI shows the covered period ("History available: last 30 days").
- Exports (CSV/JSON) stream from the same readers and apply redaction again.

## 7. Durability and safety

- Data lives under `~/.orbit/data/` (outside the repository; ignored by `.gitignore`, blocked by the pre-commit hook).
- File permissions restricted to the current user; no secrets are ever written to these files.
- Corruption is isolated per segment: a damaged segment is quarantined (`.bad`) and skipped; the rest keeps working.
- Disk-full and slow-disk conditions degrade gracefully (rollups only) and raise an Orbit self-monitoring alert.

## 8. Verification

The backend ships a repeatable benchmark (`./mvnw -Pbench verify`) that generates 30 days of synthetic data for the reference load and asserts:
- total size < 150 MB, write path ≥ 50,000 records/s on one core without blocking probes,
- 30-day uptime + p95 query < 200 ms, 24-hour raw chart query < 100 ms,
- recovery after a simulated crash mid-write loses at most the last flush window (≤ 1 s).

## 9. Feature IDs

| ID | Feature |
|---|---|
| CORE-22 | 30-day history store: segmented binary log, zstd columnar blocks, indexes, rollups, retention, crash recovery |
| BE-52 | History, events and audit query APIs with automatic resolution |
| BE-53 | Application log rotation (30 days, size cap, JSON, masked) |
| FE-58 | History range picker (24 h / 7 d / 30 d / custom) and coverage indicator in charts, SLA and incident pages |
