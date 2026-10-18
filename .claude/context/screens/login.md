---
screen: login
title: "Login and 2FA"
route: "index.html#/login"
status: planned
spec: docs/01-architecture.md §3
updated: 2026-10-18
---

# Login and 2FA

## Purpose
Username/password, TOTP step, recovery codes.

## Layout and components
_To be filled as the screen is built (component tree, file paths)._

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-08 · Authentication, RBAC, vault and audit](../features/CORE-08-authentication-rbac-vault-and-audit.md) — planned

## Code
_None yet._

## Tests
_None yet._

## Changelog
- 2026-10-18 — context file created.
