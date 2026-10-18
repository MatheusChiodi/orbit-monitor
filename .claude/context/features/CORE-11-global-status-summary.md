---
id: CORE-11
title: "Global status summary"
area: frontend
group: "Wall"
status: done
screens: [wall]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-11 · Global status summary

## Summary
Header phrase ("1 monitor down" / "All systems operational"), counts, tab title `(3) Orbit`, exceptions-first ordering.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md)

## Code
- `frontend/src/domains/monitor/status/status.ts`
- `frontend/src/domains/wall/components/WallHeader/WallHeader.tsx`

## Tests
- `frontend/src/domains/monitor/status/status.test.ts`
- `frontend/src/domains/wall/components/WallHeader/WallHeader.test.tsx`

## Decisions and notes
- `globalPhrase` returns a `Message` ("1 monitor down" / "1 monitor fora", plural via i18next); the header shows it in an `aria-live` status region.
- Counters `1 down · 2 warning · 17 ok`; a zero counter is dimmed so color only carries meaning.
- Tab title `(3) Orbit`; exceptions-first sort: down → warning → ok, unowned before acknowledged, oldest first.

## Changelog
- 2026-10-18 — context file created (status: done).
- 2026-10-18 — translated to English with en/pt-BR phrases (status: done).
