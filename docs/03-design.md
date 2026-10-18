# Orbit Monitor — Design

Goal: someone 3 meters from the TV knows in **one second** whether there is a problem, **where** and **for how long**; in five seconds they know **what to do**. The rest of the system (the editing console) inherits the same language, at a higher density.

## 1. Principles

1. **The screen changes shape with severity.** Green: calm and business indicators. Problem: the worst incident takes half the screen. Never a static grid of 40 identical tiles.
2. **Exceptions first.** What is normal stays small and quiet; what needs action is large and shows the rule in writing (`QTY = 347 · rule QTY < 200`).
3. **Color only with meaning.** Red = down, amber = warning, green = ok, blue = informational. Nothing colored for decoration. State never depends on color alone: it always comes with a label (`DOWN`) and a position.
4. **Readable from afar.** No text below 0.65 rem (≈12 px on 1080p); values in tabular monospace so they don't "jump" when they change.
5. **Motion communicates, it doesn't decorate.** Pulse only on an incident with no owner; layout transition when the hero changes; nothing spins, nothing floats. `prefers-reduced-motion` turns everything off.
6. **Zero scroll on the wall.** Everything fits in 16:9. On laptops and phones, the same screen becomes a scrollable page.

## 2. Tokens

### Colors

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#07090d` | Wall background |
| `--s1` / `--s2` / `--s3` | `#0d1117` / `#121820` / `#182029` | Surfaces on three levels |
| `--line` / `--line-2` | `rgba(255,255,255,.07)` / `.13` | Borders and dividers |
| `--text` / `--muted` / `--dim` | `#eef2f7` / `#8b96a6` / `#5a6575` | Three text levels |
| `--ok` | `#22c55e` | Operational |
| `--warn` | `#f5a524` | Warning |
| `--down` | `#ff3b4f` | Down |
| `--info` | `#3b9eff` | Informational, focus, brand |

State backgrounds use the color at 10–16% opacity in a vertical gradient (strong at the top, fading toward the bottom). State borders at 45–70%. Text on a state background uses light variants (`#ffb3ba`, `#ffd48a`, `#a9f0c3`).

Minimum contrast 4.5:1 for body text and 3:1 for large labels, verified for the three colors on `--s1`.

### Typography

* **Inter Tight** (600–800) for titles and headline numbers: condensed enough for long names to fit on one line.
* **Inter** (400–600) for text.
* **Geist Mono** (400–600) for values, times, rules and anything that changes frequently. Always `font-variant-numeric: tabular-nums`.

Scale (rem, fluid base):

| Role | Size | Example |
|---|---|---|
| Headline | 2.4 rem | Incident name, "All systems operational" |
| Main value | 1.5 rem | `349 QTY` |
| Clock / elapsed time | 1.05–1.25 rem | `4min 01s ago` |
| Row title | .88–.9 rem | Monitor name in lists |
| Body / rule | .78–.85 rem | `rule QTY < 200` |
| Section label | .68 rem, uppercase, .12em tracking | `NEAR THRESHOLD` |
| Minimum | .62 rem | Acronyms and axes |

### Fluid base

`html { font-size: clamp(12px, .7vw + .45vh, 36px) }` — 1080p ≈ 18 px, 1440×900 ≈ 14 px, 4K ≈ 36 px. The whole layout is in `rem`, so the wall scales to any TV without touch-ups.

### Space and shape

* 0.8 rem grid gap between panels; 0.9 rem inner padding; 0.9 rem radius on panels, 0.4–0.5 rem on cells and buttons.
* No shadows on the wall (uniform dark background); depth comes from the three surface levels and the borders.
* 0.35 rem side bar in the state color on the hero panel, a signal recognizable even from the corner of the eye.

## 3. Wall anatomy (1080p)

```
┌ header (3.2rem) ─ brand · environment · [global status] · counts ······ updated · clock · fullscreen ┐
├───────────────────────────────────────────────┬─────────────────────────────────────────┤
│ STATUS (hero)                          ~57%   │ ALL MONITORS                     ~60%   │
│ sev · group · type ············ 4min 01s ago  │ group │ cell │ cell │ cell              │
│ Incident name (2.4rem)                        │ group │ cell │ cell                     │
│ 349 QTY  rule QTY < 200  [+75% over limit]    │ …                                       │
│ ┌ 60-min chart with threshold line ─────────┐ ├─────────────────────────────────────────┤
│ └───────────────────────────────────────────┘ │ TIMELINE                         ~40%   │
│ Impact [chips] ·· escalates in · [Acknowledge]│ hh:mm:ss ● title / detail               │
├───────────────────────┬───────────────────────┤                                         │
│ ALSO ACTIVE           │ NEAR THRESHOLD        │                                         │
│ short list            │ headroom bars         │                                         │
└───────────────────────┴───────────────────────┴─────────────────────────────────────────┘
```

Column ratio 1.5 : 1. The left side is **action** (what to do now and what comes next); the right side is **context** (everything and the history).

### Components

**Global status (header).** Pill with a dot + short phrase (`1 monitor down`, `2 warning`, `All systems operational`). The dot blinks only in red. Next to it, three counters `1 down · 2 warning · 17 ok`. The tab title repeats the count: `(3) Orbit`.

**Hero.** Four bands: identification; name + value + rule + deviation; chart; footer with impact and acknowledgement. When there is no problem: green circle with slow ripples, "All systems operational", 24 h availability, last recovery, how many monitors are near their threshold.

**Threshold chart.** Thin line in the state color, threshold dashed white at 45%, area between line and threshold filled at 16–18% when violated, dot on the current value, translucent red gaps where there was no response. Axis with five ticks (`-60min … now`), grid at 5%.

**Near threshold.** Horizontal headroom bar (green; amber below 25%), current value and rule in mono, large percentage on the right. Sorted from least headroom to most, five items.

**Matrix.** Group name on the left with `3/4 ok · WARN`; 8.4 rem cells in three columns: state dot, name, value in mono. Cells with a problem move to the start and change background and border; red ones with no owner blink softly.

**Timeline.** Time in mono, colored dot, bold title, detail in mono. A new event gets a blue background that fades out over 3 s. Acknowledgements come in blue (informational), not green.

**Acknowledge.** The only action button on the wall. Solid red when the incident is *down*, neutral when it is *warning*. Once clicked it becomes text: `M. Chiodi acknowledged at 17:04`.

## 4. Motion

| Moment | Animation | Duration |
|---|---|---|
| Hero swap | shared `layoutId`; the old one leaves with fade/scale .98, the new one enters with fade/scale 1 | 350 ms, ease-out |
| New incident in the matrix | cell changes color with a background and border transition | 400 ms |
| Incident with no owner | opacity blink on the side bar and on the cell, 1.4 s, infinite | – |
| New event in the timeline | blue background 16% → 0 | 3 s |
| All systems operational | green ring expanding and fading | 2.6 s, infinite |
| Counters and values | no number animation; they swap in place (tabular) | – |

No springs, no displacement larger than 8 px. Everything off under `prefers-reduced-motion`.

## 5. Editing console

Same tokens, higher density (`font-size` 14–15 px), dark theme by default with a light theme available. Patterns:

* Two-column form: configuration on the left, **live preview** on the right (executed request, SELECT result as a table with detected types).
* SQL editor with highlighting, autocomplete and the visible "guards" (`SELECT only · Timeout 5s · Max 500 rows · Credential in vault`).
* Conditions in rows `field · operator · value · level`, with instant validation against the preview ("this condition would fail right now").
* Wall layout editor: 12-column grid, draggable blocks, 1080p/4K preview and an "what if there is an incident" simulator.

## 6. Responsive

| Width | Behavior |
|---|---|
| ≥ 1100 px and 16:9 | Full wall with no scroll, fluid font |
| < 1100 px or aspect ratio ≥ 4:3 | One column, scroll, fixed 14 px font, chart 12 rem tall, matrix as a list |
| Phone | Hero, Also active, Near threshold, Matrix, Timeline in that order; Acknowledge button at full width |

## 7. Accessibility

* State always with text, never color alone.
* Verified contrast (see tokens); visible focus in blue; buttons 2.2 rem tall.
* `aria-live="polite"` on the status bar and on the hero for screen readers.
* Fullscreen via the browser API; no mouse dependency on the wall.

## 8. Name and identity

* Brand: **Orbit**. Symbol: ring in a blue→green gradient with a dark core. No mascot, no 3D.
* Message tone of voice: short, factual, no exclamation marks; English by default, pt-BR when selected. `Reconciliation queue down · QTY = 347 · rule QTY < 200`.
