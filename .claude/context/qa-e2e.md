---
title: "QA — end-to-end, accessibility and performance checks"
owner: orbit-qa
status: active
updated: 2026-10-22
---

# QA — end-to-end, accessibility and performance checks

## Scope
Browser-level checks that unit tests cannot cover: the wall in demo mode, language switching,
the operator name prompt, view-only access, the dev-only viz gallery, axe audits and the wall budgets.

## Code
- `frontend/playwright.config.ts` — two servers: production preview on 5288 (default `baseURL`, built
  into `frontend/e2e/.dist`, git-ignored) and the dev server on 5287 (viz gallery only).
- `frontend/e2e/support/` — `goOffline` (cuts `/api` and `/ws` → demo mode), `fakeApi`, `rememberOperator`, URLs.
- Specs: `wall-demo`, `i18n`, `console-operator`, `console-view-only`, `viz-gallery`, `a11y`, `wall-performance`.
- Run: `cd frontend && npm run e2e` (Chromium; `npx playwright install chromium` once).

## Tests
- 33 passing, 7 `test.fixme` (known bugs; each comment names the owner). To verify a fix, change
  `test.fixme(` to `test(` and run it; when enabling an a11y fixme also drop its rule from `KNOWN` in `a11y.spec.ts`.

## Findings (2026-10-18, HEAD 53cbc38)
| # | Finding | Owner | Pending test |
|---|---|---|---|
| 1 | Wall initial load 166.9 KB gzip > 150 KB budget (shared chunk with react-dom, motion, i18next: 145 KB) | frontend-agent | `wall-performance` budget |
| 2 | Timeline events are preformatted English (`title`/`detail`), pt-BR wall mixes languages | frontend-agent + backend-agent (BE-38) | `i18n` timeline |
| 3 | SoundToggle name "Sound alerts" does not contain visible "Muted" (WCAG 2.5.3) | frontend-agent | `a11y` sound toggle |
| 4 | `--dim` (3.2:1) used on small text: operator hint, chart axis labels (WCAG 1.4.3) | frontend-agent / orbit-themes | `a11y` contrast x2 |
| 5 | Wall has no `<h1>` | frontend-agent | `a11y` heading |
| 6 | FE-49 Acknowledge renders 38.5 px tall on phones (spec: 44 px) | frontend-agent | `wall-demo` touch target |
| 7 | `OrbitIntro` vitest flaky under the full suite (lazy import vs `findBy` timeout) | fx-agent | — (passes alone) |

Performance (preview build, headless Chromium, software WebGL): FCP ≈ 0.35–1.1 s, LCP ≈ 0.9–1.9 s;
the calm wall loads the 3D orb (orbMaterials ≈ 235 KB gzip, after first paint, as designed), runs at
≈ 5–8 fps for ~2 s, then the watchdog downgrades to `minimal`, removes the canvases and settles at 60 fps.
`?motion=off` loads no FX chunk.

## Decisions and notes
- **Playwright over Cypress**: out-of-process runner (multi-page, WebSocket routing via `routeWebSocket`,
  multiple web servers), Apache-2.0, far wider adoption in 2026; Cypress's in-browser runner has the nicer
  debugging UI but cannot route WebSockets as simply. Sources: https://bugbug.io/blog/test-automation-tools/cypress-vs-playwright/ ,
  https://testingbot.com/cypress-vs-playwright
- **@axe-core/playwright over pa11y / Lighthouse**: same axe-core engine, runs inside the existing specs
  against the exact page state (after demo data renders), MPL-2.0; pa11y suits URL-list crawling in CI.
  Sources: https://accessibility-manual.dwp.gov.uk/best-practice/automated-testing-using-axe-core-and-pa11y ,
  https://www.ramotion.com/blog/practical-accessibility-testing-with-pa11y-and-axe-core/
- Tests run against the **production preview**, not the dev server: the working tree is shared by
  several agents and Vite HMR reloaded pages mid-test (`net::ERR_ABORTED`).
- Automated axe covers only part of WCAG; keyboard reachability is checked by hand in `a11y.spec.ts`.

## Changelog
- 2026-10-18 — Playwright + axe suite created; 7 findings reported to their owners.
- 2026-10-22 — demo specs open pages with `?demo`; new `no-backend.spec.ts` proves the console and wall never invent data without a server.
