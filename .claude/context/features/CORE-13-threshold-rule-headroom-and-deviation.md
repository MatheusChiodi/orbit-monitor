---
id: CORE-13
title: "Threshold rule, headroom and deviation"
area: frontend
group: "Monitor"
status: done
screens: [wall]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-13 · Threshold rule, headroom and deviation

## Summary
Rule text, headroom percentage and "+75% over threshold" deviation.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md)

## Code
- `frontend/src/domains/monitor/rules/rules.ts`

## Tests
- `frontend/src/domains/monitor/rules/rules.test.ts`

## Decisions and notes
- `deviationLabel` returns a `Message`: `+75% over limit` / `+75% do limite`; zero limits show the absolute difference.
- `headroom` is a fraction of the limit, negative when violated, null for `==`/`!=` rules.
- `formatReading` shows "no response" / "sem resposta" for null values.

## Changelog
- 2026-10-18 — context file created (status: done).
- 2026-10-18 — translated to English, deviation as i18n message (status: done).
