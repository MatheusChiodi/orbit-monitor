---
id: BE-42
title: "Status page API"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# BE-42 · Status page API

## Summary
Public/internal read-only, cached, no personal data

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/status/StatusPageBuilder.java`
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/status/StatusPageService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/StatusPageController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/Editors.java`
- `backend/config-examples/orbit.status-pages.example.json`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/status/StatusPageBuilderTest.java`
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/status/StatusPageServiceTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/StatusPagesApiTest.java`

## API
| Method | Path | Body / response |
|---|---|---|
| GET | `/api/status/{slug}` | `{ title, overall, groups: [{ name, state, uptimePercent }], generatedAt }`; `Cache-Control: public, max-age=30` (public page) or `private, max-age=30` (internal, editors only), `ETag`, `If-None-Match` → 304; internal page for a view-only client → 404 |
| GET | `/api/status-pages` | `{ version: 1, items: StatusPage[] }` — public pages only for view-only clients, all for editors |
| POST | `/api/status-pages` | `{ id, slug, title, pub, groupIds }` → 201 (editors); 409 when the id exists |
| PUT | `/api/status-pages/{id}` | same body (editors) |
| DELETE | `/api/status-pages/{id}` | 204 (editors) |

`StatusPage = { id, slug, title, pub, groupIds, updatedAt, updatedBy }`.

## Decisions and notes
- Only group name, state and uptime; overall = worst state; no values, errors, ids or operator names in the rendered view.
- `StatusPageBuilder.build`: groups in the page's order with name, state and uptime rounded to 2 decimals; groups without data are left out (their internal id is never shown); overall = worst listed state, UNKNOWN when nothing is known.
- Group state comes from the wall group views, so monitors in maintenance are ignored (CORE-07); uptime is the mean in-memory availability of the members that have data.
- Slugs `[a-z0-9][a-z0-9-]{0,39}` unique; title up to 80 characters. Internal pages answer 404 (not 403) to view-only clients so their existence is not revealed; "editor" is the same access policy check as mutations (no login).
- Caching: manual ETag + `Cache-Control` set on the servlet response (replacing the API-wide `no-store` of the access filter) instead of Spring's `ShallowEtagHeaderFilter`, which skips responses carrying `no-store` and still renders the body; the ETag hashes the view without `generatedAt` so an unchanged page answers 304. Same pattern as public APIs (e.g. `public, max-age=60` + ETag). Sources: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-caching.html, https://docs.spring.io/spring-framework/docs/6.2.1/javadoc-api/org/springframework/web/filter/ShallowEtagHeaderFilter.html
- A browser page for the status view is not part of this backend feature (frontend/screens).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — status page view builder implemented; StatusPageBuilderTest un-pended (store and endpoint pending).
- 2026-10-22 — orbit.status-pages.json store, editor CRUD and cached read-only GET /api/status/{slug} with ETag; internal pages only for editors (status: done).
- 2026-10-24 — server-rendered HTML page at /status/{slug} reuses this view, visibility and caching; see BE-59.
