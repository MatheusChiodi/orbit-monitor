---
screen: mobile-on-call
title: "Mobile on-call view"
route: "wall.html (narrow)"
status: done
spec: FE-49, docs/03-design.md §6
updated: 2026-10-24
---

# Mobile on-call view

## Purpose
Hero, active incidents and full-width Acknowledge.

## Layout and components
- `WallApp` → `useMediaQuery('(max-width: 639px)')` → `OnCallView` (`frontend/src/domains/wall/components/OnCallView/`): status label, monitor name, reading + rule, elapsed time, full-width Acknowledge; panel "Active incidents" with one row per open incident

## States
- Loading, empty install ("No monitors yet" via `WallEmpty`, never "All systems operational"), error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [FE-49 · Mobile on-call view](../features/FE-49-mobile-on-call-view.md) — done

## Code
- `frontend/src/domains/wall/components/OnCallView/OnCallView.tsx`

## Tests
- `frontend/src/domains/wall/components/OnCallView/OnCallView.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — responsive wall order in place; dedicated on-call view pending (FE-49).
- 2026-10-18 — dedicated on-call view on phones.
- 2026-10-24 — empty install state; Acknowledge is the primary button; hero name and reading in Archivo (`display-wide`) on the token scale.
