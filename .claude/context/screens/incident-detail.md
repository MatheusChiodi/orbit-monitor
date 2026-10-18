---
screen: incident-detail
title: "Incident detail"
route: "index.html#/incidents/:id"
status: planned
spec: docs/02-features.md §4
updated: 2026-10-18
---

# Incident detail

## Purpose
Timeline, comments, acknowledge, ticket link, escalation countdown, postmortem.

## Layout and components
_To be filled as the screen is built (component tree, file paths)._

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-06 · Incidents and acknowledgement](../features/CORE-06-incidents-and-acknowledgement.md) — in-progress
- [FE-39 · Incident page](../features/FE-39-incident-page.md) — tests-pending
- [FE-40 · Escalation countdown](../features/FE-40-escalation-countdown.md) — tests-pending

## Code
_None yet._

## Tests
_None yet._

## Changelog
- 2026-10-18 — context file created.
