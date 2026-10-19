---
id: BE-09
title: "gRPC health probe"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-09 · gRPC health probe

## Summary
Standard `grpc.health.v1` check

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/grpc/GrpcHealthProbe.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/grpc/GrpcHealthProbeTest.java`

## Decisions and notes
- grpc.health.v1 client port; SERVING = OK, anything else or errors = DOWN.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
