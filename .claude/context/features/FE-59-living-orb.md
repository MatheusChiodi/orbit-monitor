---
id: FE-59
title: "Living orb (system map)"
area: frontend
group: "Visual FX"
status: in-progress
screens: [wall, monitor-list]
spec: docs/03-design.md §4.2 (Living orb)
updated: 2026-10-18
---

# FE-59 · Living orb (system map)

## Summary
The 3D orb becomes a live map: core = overall health, one ring per group, one satellite per monitor (color = state, size = importance, speed ∝ check frequency), heartbeat ticks, near-threshold drift, DOWN stop + trail, maintenance hollow; hover tooltip, click to open, drag/zoom, keyboard navigation, legend, text summary; aggregation above 60 monitors; mini orb in the header.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented (wall and console done; "open the monitor" needs `id="monitor-<id>"` rows in GroupList)
- [ ] All tests green, none pending

## Code
- `frontend/src/shared/fx/LivingOrb/orbModel.ts` — pure data → visual mapping (core, rings, satellites, drift, halo, trail, hollow, aggregation, heartbeat, keyboard order)
- `frontend/src/shared/fx/LivingOrb/orbText.ts` — text summary for `aria-describedby` and state labels (incl. UNKNOWN)
- `frontend/src/shared/fx/LivingOrb/orbProjection.ts` — shared orthographic projection, depth fade, state colors, SVG frame
- `frontend/src/shared/fx/LivingOrb/OrbSvg.tsx` — static 2D orb (`minimal`, no WebGL, loading) and the header mini orb
- `frontend/src/shared/fx/LivingOrb/LivingOrbScene.tsx` — lazy R3F scene: glass core with breathing halo, depth-faded glass orbit lines, emissive satellites, heartbeat pulses, trails, drag/zoom rig
- `frontend/src/shared/fx/LivingOrb/orbShaders.ts` — orbit line shader and the shared glow sprite texture
- `frontend/src/shared/fx/LivingOrb/LivingOrb.tsx` — level gate, DOM tooltip (SafeValue), keyboard, legend, live region, summary
- `frontend/src/shared/fx/LivingOrb/MiniOrb.tsx` — header mini orb
- Integration: `HeroCalm.tsx` (`monitors`/`groups` props → LivingOrb), `WallScreen.tsx` (passes the snapshot), `WallHeader.tsx` (`orb` prop → MiniOrb), `ConsoleApp.tsx` (interactive orb above the monitor list; open = scroll to `#monitor-<id>`)
- i18n: `fx.orb.*` in `en.json` / `pt-BR.json`

## Tests
- `frontend/src/shared/fx/LivingOrb/orbModel.test.ts`
- `frontend/src/shared/fx/LivingOrb/orbText.test.ts`
- `frontend/src/shared/fx/LivingOrb/LivingOrb.test.tsx`
- `frontend/src/shared/fx/LivingOrb/MiniOrb.test.tsx`
- `frontend/src/domains/wall/components/HeroCalm/HeroCalm.fx.test.tsx`
- `frontend/src/domains/wall/components/WallHeader/WallHeader.fx.test.tsx`
- `frontend/src/app/console/ConsoleApp.fx.test.tsx` (FE-59 case)

## Decisions and notes
- Mapping is pure (`buildOrbModel`) and tested without WebGL; the 3D scene and the SVG read the same model and the same placement formula, so the static and live orbs agree.
- Levels: `off` → flat 2D symbol + text summary; `minimal` or no WebGL → static SVG orb with state colors (no 3D, honoring §4.2 "off/minimal → no 3D"); `standard`/`expressive` → live 3D, intensity scales speed, glow and idle drift.
- Bloom only on the core, done with an additive sprite instead of `@react-three/postprocessing` (no extra full-screen passes on TV boxes, no extra dependency). Depth of field approximated by depth fade on rings/satellites. Sources consulted: [r3f-postprocessing guide](https://skills.cat/skills/enzed/r3f-skills/r3f-postprocessing), [postfx-bloom guide](https://playbooks.com/skills/bbeierle12/skill-mcp-claude/postfx-bloom) (selective bloom needs an EffectComposer pass; recommended to scale down on weak GPUs).
- No drei `OrbitControls` / `Html`: drag-rotate and wheel-zoom are ~20 lines on the wrapper; the tooltip is a DOM element positioned from the projected satellite every frame (data never enters the canvas).
- Optional per-monitor fields the API does not send yet: `importance`, `intervalSeconds`, `lastCheckAt`, `maintenance`, status `UNKNOWN`. Without them: importance 2, 30 s interval, heartbeat per interval with a stable per-monitor phase.
- More than 60 monitors → one satellite per group and state, with a count (tooltip shows "N monitors"; Enter/click do not open an aggregate).
- Tests resolve the lazy 3D chunk once in `beforeAll`, so no assertion depends on dynamic-import speed under a parallel run.
- On the wall the orb is passive (no mouse dependency); `interactive` is for the console and touch walls.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — orb model, text summary, static SVG, live 3D scene, mini orb; wall integration (status: in-progress).
- 2026-10-18 — Interactive orb in the console monitor list (tooltip, keyboard, legend, drag, zoom).
