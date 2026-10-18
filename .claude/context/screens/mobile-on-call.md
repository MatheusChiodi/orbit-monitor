---
screen: mobile-on-call
title: "Mobile on-call view"
route: "wall.html (narrow)"
status: in-progress
spec: FE-49, docs/03-design.md §6
updated: 2026-10-18
---

# Mobile on-call view

## Purpose
Hero, active incidents and full-width Acknowledge.

## Layout and components
- Today the wall itself collapses to one column on phones: hero, also active, near threshold, matrix, timeline; Acknowledge at full width

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [FE-49 · Mobile on-call view](../features/FE-49-mobile-on-call-view.md) — tests-pending

## Code
- `frontend/src/app/theme.css`
- `frontend/src/domains/wall/components/Hero/Hero.tsx`

## Tests
- `frontend/src/domains/wall/components/WallScreen/WallScreen.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-18 — responsive wall order in place; dedicated on-call view pending (FE-49).
