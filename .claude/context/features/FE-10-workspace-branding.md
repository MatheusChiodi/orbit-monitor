---
id: FE-10
title: "Workspace branding"
area: frontend
group: "Theming and personalization"
status: done
screens: [wall]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-10 · Workspace branding

## Summary
Sanitized SVG logo and workspace name in the header

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md)

## Code
- `frontend/src/domains/workspace/branding/sanitizeSvg.ts`
- `frontend/src/domains/workspace/WorkspaceBrand/WorkspaceBrand.tsx`
- `frontend/src/domains/wall/components/WallHeader/WallHeader.tsx` (`brand` prop)
- `frontend/src/shared/api/types.ts` (`WallSnapshot.branding`)

## Tests
- `frontend/src/domains/workspace/branding/sanitizeSvg.test.ts`
- `frontend/src/domains/workspace/branding/sanitizeSvg.hardening.test.ts`
- `frontend/src/domains/workspace/WorkspaceBrand/WorkspaceBrand.test.tsx`
- `frontend/src/domains/wall/components/WallHeader/WallHeader.test.tsx`

## Decisions and notes
- Decision: a strict allowlist sanitizer on `DOMParser` (`image/svg+xml`) instead of DOMPurify. DOMPurify (Apache-2.0/MPL-2.0, ~20 kB) still allows external `https:` hrefs by default and needs hooks for that; an allowlist of drawing elements/attributes is smaller, keeps the wall bundle free of a new dependency and matches what tldraw moved to. Sources: https://grida.co/docs/wg/research/untrusted-svg-rendering, https://www.miggo.io/vulnerability-database/cve/GHSA-4mx9-3c2h-hwhg.
- Removed: script, style, foreignObject, image, animation/set elements, anything outside the SVG namespace, every `on*` and `style` attribute, `javascript:`/`data:` values; `href`/`xlink:href` only as `#id`, `url()` only as `url(#id)`. Links (`<a>`) are unwrapped. Max 64 KiB; non-SVG or malformed XML is rejected with translatable errors.
- Defense in depth: the sanitized SVG is rendered only through `<img src="data:image/svg+xml,…">`, never as inline markup, so nothing in it can run even if a bypass existed.
- Long names truncate with the full name in `title`; logo alt text is translated (en / pt-BR).
- The wall header shows the brand when the snapshot carries `branding` (optional field; the backend does not send it yet).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-22 — implemented SVG sanitizer, WorkspaceBrand and wall header wiring (status: done).
