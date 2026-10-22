---
id: BE-09
title: "gRPC health probe"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-09 · gRPC health probe

## Summary
Standard `grpc.health.v1` check

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/grpc/GrpcHealthProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/grpc/GrpcHealthProbeTest.java`

## Decisions and notes
- grpc.health.v1 client port; SERVING = OK, anything else or errors = DOWN.
- Client port instead of grpc-java in this module: grpc-netty-shaded is a heavy dependency; the production adapter can call `grpc.health.v1.Health/Check` with a deadline.
- SERVING is OK; NOT_SERVING, SERVICE_UNKNOWN, UNKNOWN and any exception (deadline exceeded, unavailable) are DOWN with the reason in `error`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented gRPC health probe over a client port; errors reported, not thrown (status: done).
