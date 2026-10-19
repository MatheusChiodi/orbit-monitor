---
id: FE-03
title: "Theme gallery"
area: frontend
group: "Theming and personalization"
status: in-progress
screens: [theme-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-03 · Theme gallery

## Summary
Default Orbit Dark or 30 built-in editor-inspired themes (Dracula, Nord, Tokyo Night, Catppuccin, …) plus 6 accessibility themes; gallery with live mini-wall previews, filters, search, favorites, hover preview; per device, workspace default, wall override and `?theme=`. See docs/05 §1.3.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[theme-editor](../screens/theme-editor.md)

## Code
- `frontend/src/shared/theme/types.ts`
- `frontend/src/shared/theme/registry.ts`
- `frontend/src/shared/theme/themes/*.json (37 themes)`
- `frontend/src/shared/theme/ThemeProvider.tsx`
- `frontend/src/shared/theme/deviceStore.ts`
- `frontend/src/domains/settings/appearance/AppearanceSettings/AppearanceSettings.tsx`
- `frontend/src/domains/settings/appearance/ThemeGallery/ThemeGallery.tsx`
- `frontend/src/domains/settings/appearance/ThemeCard/ThemeCard.tsx`
- `frontend/src/domains/settings/appearance/WallPreview/WallPreview.tsx`
- `frontend/src/domains/settings/appearance/themeLabel.ts`
- `docs/themes.md`

## Tests
- `frontend/src/shared/theme/registry.test.ts`
- `frontend/src/shared/theme/ThemeProvider.test.tsx`
- `frontend/src/shared/theme/locales.test.ts`
- `frontend/src/domains/settings/appearance/ThemeGallery/ThemeGallery.test.tsx`
- `frontend/src/domains/settings/appearance/AppearanceSettings/AppearanceSettings.test.tsx`

## Decisions and notes
- Ids follow docs/05 §1.3: orbit-dark, 30 editor themes, high-contrast-dark, high-contrast-light, oled-black, colorblind-deuteranopia/protanopia/tritanopia. The old preset ids (`light`, `high-contrast`, `deuteranopia`…) were dropped with the old pending tests.
- Palettes were read from each author's repository (raw VS Code theme JSON, palette.json or colors file) and every license checked: all 30 are MIT. Credits per theme in JSON and docs/themes.md. Monokai via VS Code's built-in MIT port; Palenight via whizkydee (Material Theme is now proprietary); Shades of Purple's extra condition (derived work MIT) is met by Orbit's MIT license.
- Token mapping is mechanical (see docs/themes.md): s1 = editor background, bg = darkest side panel, s2/s3 = OKLab lightness steps, line = text at 7 %/13 %. Upstream colors that fail FE-02 ship adjusted and are listed in `adjusted`.
- Built-ins are loaded with `import.meta.glob` (eager JSON). Gotcha: Vitest 5's persistent module cache (`node_modules/.vitest-cache`) does not notice new files under a glob; delete the cache entry if a new theme does not show up in tests.
- Device choice and favorites live in localStorage (`orbit.theme`, versioned, try/catch) per FE-50; the provider exposes preview(id) for hover/focus previews on the real screen and applies a 280 ms cross-fade unless the animation level is off (FE-06).
- Gallery: card grid (auto-fill, min 15 rem) whose thumbnail is a live mini wall (hero + 18-cell matrix + two chart series) rendered with the card's own CSS variables. Previews re-declare Tailwind's `--color-*` aliases inline, because `@theme` aliases resolve at `:root` and would otherwise ignore a scoped `--bg`. Filters All/Dark/Light/Accessible/Favorites/Custom (aria-pressed), accent- and case-insensitive search over name and "inspired by", Restore default, Follow system light/dark, Make workspace default.
- Charts: every theme has `chart[8]` in a fixed categorical order (blue, orange, teal, yellow, purple, green, accent, red), written as both `--chart-1..8` and `--viz-1..8` for shared/viz (orbit-dataviz). Orbit Dark and OLED Black use the dataviz palette (#3987e5 … #e66767) as is; every series passes 3:1 on s1 and ΔE_OK ≥ 0.06.
- Remaining: mount `<ThemeProvider>` at the console/wall entries and `AppearanceSettings` on the Settings → Appearance route (frontend-agent), with `useCustomThemes` for `orbit.themes.json`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — scope expanded (30 built-in themes + accessibility, VS Code import).
- 2026-10-18 — 37 built-in theme JSONs (researched palettes + licenses), registry, ThemeProvider with device choice, favorites and hover preview; gallery UI next (status: in-progress).
- 2026-10-18 — gallery (Settings → Appearance) with live mini walls, filters, search, favorites, hover preview, duplicate & edit, import/export implemented; waiting for the route mount.
- 2026-10-18 — chart palette extended to 8 series exposed as --viz-1..8.
