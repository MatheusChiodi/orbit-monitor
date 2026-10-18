---
id: CORE-12
title: "Value formatting"
area: frontend
group: "Shared"
status: done
screens: [wall, data-and-display]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-12 · Value formatting

## Summary
Integer, decimal, currency, percentage, duration, relative date. Currently pt-BR only; must become locale-aware (CORE-15).

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md), [data-and-display](../screens/data-and-display.md)

## Code
- `frontend/src/shared/format/format.ts`

## Tests
- `frontend/src/shared/format/format.test.ts`

## Decisions and notes
- Every formatter takes the locale (`en` default, `pt-BR`) and uses `Intl.NumberFormat`; non-breaking spaces are normalized.
- Durations are language-neutral (`4min 01s`, `1h 05min`); the "ago" / "há" and "now" / "agora" phrases come from the locale files.
- Percentages take values already in percentage points (2.5 → `2.5%`); currency defaults to BRL and follows the locale's separators.

## Changelog
- 2026-10-18 — context file created (status: in-progress).
- 2026-10-18 — locale-aware formatting for en and pt-BR (status: done).
