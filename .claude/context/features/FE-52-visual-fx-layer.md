---
id: FE-52
title: "Visual FX layer (3D, glass, Remotion)"
area: frontend
group: "Theming and personalization"
status: done
screens: [wall, monitor-list, settings, preferences, data-and-display, layout-editor]
spec: docs/03-design.md §4.2
updated: 2026-10-18
---

# FE-52 · Visual FX layer (3D, glass, Remotion)

## Summary
Distinctive "web3" look: live 3D orb in the calm hero (React Three Fiber), low-contrast animated background, glass panels with gradient borders, restrained DOWN glow, and Remotion compositions (`@remotion/player`, `@remotion/three`) for intro, onboarding and empty states. Gated by the animation level; data always stays flat and legible; lazy-loaded.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md), [monitor-list](../screens/monitor-list.md), [settings](../screens/settings.md), [preferences](../screens/preferences.md)

## Code
- `frontend/src/shared/fx/fxLevel.ts` — `resolveFx()`: the single decision of which effects run per level
- `frontend/src/shared/fx/frameMonitor.ts` — EMA frame-time monitor (> 20 ms for 3 s → downgrade)
- `frontend/src/shared/fx/FxProvider.tsx` — `FxProvider` / `useFxLevel()`, sets `<html data-fx>`
- `frontend/src/shared/fx/TiltCard/TiltCard.tsx` — glass card with hover tilt (≤ 4°, mouse only) and sheen
- `frontend/src/shared/fx/OrbitField/orbitGeometry.ts` — orbit field geometry, luminance cap, canvas 2D renderer
- `frontend/src/shared/fx/OrbitField/OrbitField.tsx` — lazy canvas component (30 fps, DPR ≤ 1.5, freezes when paused)
- `frontend/src/shared/fx/FxBackground/FxBackground.tsx` — fixed backdrop; mounts the orbit field after first paint
- `frontend/src/shared/fx/HeroOrb/HeroOrb.tsx` — gate (level + WebGL probe + error boundary) that lazy-loads the 3D orb after first paint
- `frontend/src/shared/fx/HeroOrb/OrbScene.tsx` — R3F scene: shader glass sphere (Fresnel edge, inner rim, specular glint), glowing gradient core with halo, tilted gradient ring with satellite, pointer parallax
- `frontend/src/shared/fx/HeroOrb/orbMaterials.ts` — glass/rim/core/halo shaders and the blue→green ring geometry from theme tokens
- `frontend/src/shared/fx/incident.ts` — `hasUnacknowledgedDown()`: when the wall pauses background motion
- Integration: `WallApp.tsx` (FxProvider + FxBackground + `.fx-layer`), `HeroCalm.tsx` (2D symbol as the HeroOrb fallback), `Hero.tsx` (`fx-down-glow` when DOWN), `Panel.tsx` (`surface` prop, `glass` by default), `ConsoleApp.tsx` (FxProvider + FxBackground + FxDowngradeNotice; boot intro beside the operator prompt; first-monitor and check-flow guides on the empty monitor list)
- `frontend/remotion/` — Remotion entry (`index.ts`, `Root.tsx`), `palette.ts`, `compositions/` (`OrbitBoot` with `@remotion/three`, `CheckFlow`, `FirstMonitor`, `RemotionOrb`, `registry.ts`), `render.mjs` (MP4 to `remotion/out/`, README GIFs to `docs/assets/readme/` with a 5 MB guard)
- `frontend/package.json` — `remotion:studio`, `remotion:render` scripts
- `docs/assets/readme/{orbit-boot,check-flow,first-monitor}.gif` — rendered compositions (1.2 MB, 248 KB, 158 KB)
- `frontend/src/shared/fx/OrbitIntro/` — `OrbitIntro` gate (poster + play at standard, autoplay at expressive), lazy `IntroPlayer` (`@remotion/player`), `introProps` (i18n + live palette)
- `frontend/src/shared/fx/FxDowngradeNotice/FxDowngradeNotice.tsx` — "Keep simplified" / "Try again" after an automatic downgrade
- `frontend/src/shared/i18n/locales/{en,pt-BR}.json` — `fx.*` keys
- `frontend/src/shared/fx/fx.css` — glass, tilt sheen, DOWN glow, static backdrop (gated by `html[data-fx]`)

## Tests
- `frontend/src/shared/fx/fxLevel.test.ts`
- `frontend/src/shared/fx/frameMonitor.test.ts`
- `frontend/src/shared/fx/FxProvider.test.tsx`
- `frontend/src/shared/fx/TiltCard/TiltCard.test.tsx`
- `frontend/src/shared/fx/OrbitField/orbitGeometry.test.ts`
- `frontend/src/shared/fx/FxBackground/FxBackground.test.tsx`
- `frontend/src/shared/fx/HeroOrb/HeroOrb.test.tsx`
- `frontend/src/shared/fx/incident.test.ts`
- `frontend/src/domains/wall/WallApp/WallApp.fx.test.tsx`
- `frontend/src/domains/wall/components/HeroCalm/HeroCalm.fx.test.tsx`
- `frontend/src/domains/wall/components/Hero/Hero.fx.test.tsx`
- `frontend/src/shared/ui/Panel/Panel.fx.test.tsx`
- `frontend/src/shared/fx/OrbitIntro/introProps.test.ts`
- `frontend/src/shared/fx/OrbitIntro/OrbitIntro.test.tsx`
- `frontend/src/shared/fx/FxDowngradeNotice/FxDowngradeNotice.test.tsx`
- `frontend/src/app/console/ConsoleApp.fx.test.tsx`

## Decisions and notes
- Owned by fx-agent; integration into existing components is coordinated with frontend-agent.
- Remotion is used for compositions (player/video), not for live UI state; live 3D uses React Three Fiber; micro-interactions stay on Motion (FE-51).
- Level source: `FxProvider level` prop, else `?motion=`, else `useAnimationLevel()` (FE-06, default `standard`). `prefers-reduced-motion` forces `off`. Swap to `useMotionSettings()` once FE-06 lands.
- Gating: `off`/`minimal` → static backdrop, no 3D, glass or tilt; `standard` → orb, glass, low background, tilt ≤ 2.5°; `expressive` → full background, tilt 4°, Remotion intros. DOWN glow: none / static / pulse.
- Frame monitor smooths frame time (EMA, α 0.1), ignores gaps > 500 ms (hidden tab) and fires once; `restore()` is the "Try again" path. It only runs while something animates.
- Tilt writes `transform` directly on the element (no React state per pointer move), mouse pointers only; TiltCard is for navigational/onboarding cards, never around probe values.
- Background: 6 tilted ellipses + particles with short trails on canvas 2D (no WebGL needed). Every mark's alpha is capped so `alpha × L(color) ≤ 0.06` (WCAG relative luminance over the black-ish `--bg`). Particles: ~28 at `standard`, 60 at `expressive`. Paused = one frozen frame at 35% opacity, no rAF loop.
- Orb: no drei and no `transmission` pass (a transmissive material over a transparent canvas rendered as a flat grey disk and costs an extra pass); glass is an additive Fresnel + specular shader. No scene lights needed; `powerPreference: 'low-power'`, DPR ≤ 1.5. Parallax follows a mouse over the whole window; TVs without a mouse get a slow idle drift. The orb is `aria-hidden` and the hero text stays in the DOM beside it.
- Remotion: compositions live in `frontend/remotion/` with relative imports only (no `@/` alias, so the Remotion bundler needs no config); every visible word arrives as props built from the product i18n. Inside `<ThreeCanvas>` all motion derives from `useCurrentFrame()` (no `useFrame`). The orb shaders are shared with the live hero (`orbMaterials.ts`). The Player chunk loads only at `expressive` or after "Play" at `standard`. `acknowledgeRemotionLicense` is not set: the owner decides on the Remotion license.
- Player: `moveToBeginningWhenEnded={false}` so an intro rests on its last frame, then a "Replay" button; `numberOfSharedAudioTags={0}` (no audio). Headless Chrome with SwiftShader triggers the frame-time downgrade within seconds (software WebGL), which is the intended behavior on slow devices; visual checks use the GPU (`--use-angle=d3d11`).
- Budget (2026-10-18, `vite build`): `wall.html` static closure = 167.3 KB gzip (wall 7.6 + shared chunk 145.0 + jsx-runtime 3.3 + vanilla 2.0 + CSS 9.3). FX adds ≈ 3 KB of it (gates + fx.css); the overrun vs. the 150 KB budget comes from react-dom and Motion (FE-51) in the shared chunk. Lazy FX chunks: OrbitField 1.6 KB, OrbScene 1.2 KB, three + orb shaders 242 KB, IntroPlayer (Remotion) 112 KB.
- Not yet wired: FE-06 per-category switches ("Attention signals" for the DOWN glow, "3D and visual effects", "Animated background", "Intros and guides"); `resolveFx()` is the single place to add them.
- CSS gating via `html[data-fx]` keeps the components free of level checks for pure styling; the stylesheet is unlayered so it overrides Tailwind utilities only when FX is on.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — FX level, frame monitor and provider with tests; glass/glow stylesheet (status: done).
- 2026-10-18 — TiltCard glass surface with hover tilt and sheen.
- 2026-10-18 — Animated orbit-field background (lazy, luminance-capped, paused on incident).
- 2026-10-18 — Live 3D hero orb (React Three Fiber) with 2D fallback.
