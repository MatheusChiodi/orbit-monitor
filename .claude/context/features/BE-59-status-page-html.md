---
id: BE-59
title: "Status page HTML"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# BE-59 · Status page HTML

## Summary
`GET /status/{slug}` renders a status page as plain server-side HTML for any browser, without the console bundle.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/web/StatusPageHtmlController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/StatusPageHtml.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/StatusPageController.java`
- `backend/orbit-api/src/main/resources/messages.properties`
- `backend/orbit-api/src/main/resources/messages_pt_BR.properties`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/StatusPageHtmlTest.java`

## API
| Method | Path | Body / response |
|---|---|---|
| GET | `/status/{slug}` | `text/html; charset=UTF-8`; same view, visibility and `Cache-Control` as `GET /api/status/{slug}`; internal page for a view-only client or unknown slug → 404 HTML page (`no-store`); language from `Accept-Language` (en, pt-BR) |

## Decisions and notes
- A tiny escaping string builder instead of adding Thymeleaf or Mustache: one page, no template engine dependency, and every dynamic text goes through one HTML escape (OWASP XSS Prevention Cheat Sheet: output encoding for HTML body and attribute contexts).
- No script; inline `<style>` only, which the existing CSP allows (`style-src 'self' 'unsafe-inline'`); security headers come from the access filter. `meta refresh` of 60 s keeps an open tab current without JS.
- Shows only title, group names, states, uptime and generation time (the BE-42 view); internal pages carry `noindex,nofollow`.
- Light and dark via `prefers-color-scheme`; mobile viewport.

## Changelog
- 2026-10-24 — server-rendered status page (status: done).
