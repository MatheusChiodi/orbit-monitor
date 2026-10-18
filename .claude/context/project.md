---
title: "Orbit Monitor — project context"
updated: 2026-10-18
---

# Orbit Monitor — Project Context

## What it is
Monitoring for websites, APIs and databases with a TV wall that changes shape by severity. Operators paste a URL or a `SELECT`; Orbit discovers fields, suggests display modes and turns them into conditions and alerts.

## Product shape (decided 2026-10-18)
- **Local-first**: runs entirely on the operator's machine; the only outbound traffic is the configured checks (HTTP requests, SELECTs, pings) and notifications. Binds to `127.0.0.1` by default.
- **No login**: no users, passwords, roles or 2FA. Edits only from loopback by default; LAN clients (the TV) are view-only and may acknowledge. Self-declared operator name.
- **No Orbit database**: the only DB access is SELECTs on monitored databases. Configuration lives in **one JSON file per feature** (`~/.orbit/config/orbit.<feature>.json`), filled as the operator registers data, **never committed**. Runtime history lives in memory (24 h default).

## Repository
| Path | Contents |
|---|---|
| `backend/` | Java 21, Spring Boot 3, Maven multi-module. Modules today: `orbit-api` (app), `orbit-common`, `orbit-monitor`. Package root `io.orbit` |
| `frontend/` | React 19, Vite, strict TypeScript, Tailwind CSS v4, Motion, TanStack Query, Zustand, Vitest. Entrypoints `index.html` (console) and `wall.html` (wall) |
| `docs/` | Specs 01–06 (architecture, features, design, data protection, extended features, configuration files) |
| `.claude/context/` | This living context: one file per screen and feature |

## Non-negotiable rules
1. **TDD**: test first, watch it fail, implement, watch it pass. Tests for unimplemented features are *pending* (`@Tag("pending")` / `*.pending.test.ts(x)`), excluded from the default run.
2. **English everywhere** in the repository (code, comments, commits, docs). The product supports **en (default) and pt-BR** via i18n.
3. **Privacy (LGPD / PCI DSS)**: a full card number is never displayed, logged, serialized or stored. All probe values are redacted at the probe boundary and rendered through `<SafeValue>`.
4. **Commit authorship**: the owner is the sole author; never add Co-Authored-By, session links or any AI attribution.
5. **Git**: work on `developer` and push after every commit (`main` holds the base; a hook blocks commits on it); no other branches for now; Conventional Commits; each agent stages only its own folder plus its context files; never switch branches in the shared working tree.
6. **Config files are never committed**: only `*.example.json` / `*.schema.json`. `.gitignore` + tracked pre-commit hook (`git config core.hooksPath .githooks`).
7. Files up to ~400 lines; one component per folder on the frontend; no `any`.

## Agents
| Agent | Owns | Context files it maintains |
|---|---|---|
| backend-agent | `backend/` | `features/BE-*`, backend `CORE-*` |
| frontend-agent | `frontend/` | `features/FE-*`, frontend `CORE-*`, `screens/*` |
| lead | root files, `docs/`, `.claude/CLAUDE.md`, `context/README.md`, this file | — |

Full-stack `CORE-*` files: each agent edits only its own section (`## Code` / `## Tests` lines for its folder) and appends its own changelog line.

## Timeline
- 2026-10-18 — logo deferred until the product is ready; four concept rounds explored (orb with something inside is the preferred direction; faceted/Obsidian-like rejected). Use the `logo-design` skill when resuming. Until then the UI uses the plain "Orbit" wordmark.
- 2026-10-18 — illustrated README: animated architecture and check-flow diagrams plus one SVG per feature area (docs/assets/readme).
- 2026-10-18 — no login, no Orbit database, per-feature JSON config files, local-first runtime; pre-commit hook.
- 2026-10-18 — specs written; repo initialized; open-source files (MIT); English + i18n decision; LGPD/PCI spec; 100 extended features; test-first phase started; living context created.
