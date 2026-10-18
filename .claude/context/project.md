---
title: "Orbit Monitor — project context"
updated: 2026-10-18
---

# Orbit Monitor — Project Context

## What it is
Monitoring for websites, APIs and databases with a TV wall that changes shape by severity. Operators paste a URL or a `SELECT`; Orbit discovers fields, suggests display modes and turns them into conditions and alerts.

## Repository
| Path | Contents |
|---|---|
| `backend/` | Java 21, Spring Boot 3, Maven multi-module. Modules today: `orbit-api` (app), `orbit-common`, `orbit-monitor`. Package root `io.orbit` |
| `frontend/` | React 19, Vite, strict TypeScript, Tailwind CSS v4, Motion, TanStack Query, Zustand, Vitest. Entrypoints `index.html` (console) and `wall.html` (wall) |
| `docs/` | Specs 01–05 (architecture, features, design, data protection, extended features) |
| `.claude/context/` | This living context: one file per screen and feature |

## Non-negotiable rules
1. **TDD**: test first, watch it fail, implement, watch it pass. Tests for unimplemented features are *pending* (`@Tag("pending")` / `*.pending.test.ts(x)`), excluded from the default run.
2. **English everywhere** in the repository (code, comments, commits, docs). The product supports **en (default) and pt-BR** via i18n.
3. **Privacy (LGPD / PCI DSS)**: a full card number is never displayed, logged, serialized or stored. All probe values are redacted at the probe boundary and rendered through `<SafeValue>`.
4. **Git**: work on `develop` (a hook blocks commits on `main`); Conventional Commits; each agent stages only its own folder plus its context files; never switch branches in the shared working tree.
5. Files up to ~400 lines; one component per folder on the frontend; no `any`.

## Agents
| Agent | Owns | Context files it maintains |
|---|---|---|
| backend-agent | `backend/` | `features/BE-*`, backend `CORE-*` |
| frontend-agent | `frontend/` | `features/FE-*`, frontend `CORE-*`, `screens/*` |
| lead | root files, `docs/`, `.claude/CLAUDE.md`, `context/README.md`, this file | — |

Full-stack `CORE-*` files: each agent edits only its own section (`## Code` / `## Tests` lines for its folder) and appends its own changelog line.

## Timeline
- 2026-10-18 — specs written; repo initialized; open-source files (MIT); English + i18n decision; LGPD/PCI spec; 100 extended features; test-first phase started; living context created.
