# Themes

Orbit ships **Orbit Dark** (default), **30 editor-inspired themes** and **6 accessibility themes** (spec: [05-extended-features.md §1.3](05-extended-features.md)). Each theme is one JSON file in `frontend/src/shared/theme/themes/<id>.json`, with the same schema as custom themes in `orbit.themes.json`.

## Credits and licensing

Built-in themes reproduce the **color palette** of popular editor themes. Names are used descriptively ("inspired by"); no theme assets, logos or icons are copied. Every palette was read from the author's own repository and is bundled only because its license is permissive (all MIT). Attribution (`inspiredBy`, `author`, `license`, `url`) is stored in each JSON and listed below.

Notes on sources:
- **One Dark**: values compiled from Atom's `one-dark-syntax` / `one-dark-ui` (MIT, GitHub Inc.).
- **Monokai Classic**: from VS Code's built-in `theme-monokai` (MIT, Microsoft), which credits Colorsublime; the original Monokai palette is by Wimer Hazenberg.
- **Palenight**: from `whizkydee/vscode-palenight-theme` (MIT, Olaolu Olawuyi). The original Material Theme by equinusocio is now proprietary and was not used.
- **GitHub themes**: `primer/github-vscode-theme` builds its JSON at release time; values were read from the published v6.3.5 package (MIT).
- **Gruvbox**: MIT/X11 as stated in the `morhetz/gruvbox` README.
- **Kanagawa**: Neovim theme without an official VS Code port; mapped from the `wave` palette in `rebelot/kanagawa.nvim`.
- **Everforest**: `sainnhe/everforest-vscode` (archived; MIT still applies), medium contrast.
- **Shades of Purple**: MIT plus the author's condition that derived work is MIT licensed; Orbit is MIT.

## Token mapping

| Orbit token | Taken from (editor theme) |
|---|---|
| `s1` | `editor.background` |
| `bg` | darkest of the side bar / activity bar / panel backgrounds, else `s1` 3.5 % darker (OKLab L) |
| `s2`, `s3` | `s1` shifted +3 % / +6 % in OKLab lightness (−2.5 % / −5 % on light themes) |
| `line`, `line2` | `text` at 7 % / 13 % opacity (12 % / 20 % on light themes); VS Code import uses `panel.border` |
| `text`, `muted`, `dim` | `editor.foreground`, `descriptionForeground`, comment / line number color |
| `ok`, `warn`, `down`, `info` | the theme's green, yellow, red and blue (terminal ANSI colors when defined) |
| `accent` | `focusBorder` / button color |
| `chart[6]` | six mutually distinct accents of the palette (ΔE_OK ≥ 0.065) |
| `syntax.*` | `tokenColors` for keyword, string, number, comment, function, operator, variable |
| `fx.from`, `fx.to`, `fx.glow` | accent → purple; glow = accent |

The VS Code importer (FE-04) applies the same mapping to any `*-color-theme.json` (JSONC with comments is accepted; only hex values are read).

## Contrast guard (FE-02)

Every built-in theme passes the guard (unit test `frontend/src/shared/theme/registry.test.ts`):
- `text` on `bg/s1/s2/s3` and `muted` on `bg/s1/s2`: **4.5:1**. `dim`, status colors, `accent` and chart series: **3:1**. SQL syntax on `s1`: **4.5:1** (comments 3:1).
- Status colors `ok/warn/down/info` stay at least **ΔE_OK 0.12** apart for typical vision and **0.04** under simulated protanopia, deuteranopia and tritanopia (Machado, Oliveira & Fernandes 2009, severity 1, linear RGB). Color-blind safe themes keep **0.10** for their target deficiency. States always carry a text label and an icon as well, never color alone.

When an upstream color fails, the theme ships with the nearest passing shade (OKLab lightness moved, hue kept or rotated at most 32°) and lists the token in `adjusted`.

## Built-in themes

| # | id | Name | Mode | Group | Inspired by | Author | License | Source | Adjusted |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `orbit-dark` | Orbit Dark | dark | default | — | Orbit Monitor | MIT | [repo](https://github.com/MatheusChiodi/orbit-monitor) | 0 |
| 2 | `dracula` | Dracula | dark | editor | Dracula | Dracula Theme | [MIT](https://raw.githubusercontent.com/dracula/visual-studio-code/master/LICENSE) | [repo](https://github.com/dracula/visual-studio-code) | 1 |
| 3 | `one-dark` | One Dark | dark | editor | Atom One Dark | GitHub Inc. | [MIT](https://raw.githubusercontent.com/atom/atom/master/packages/one-dark-syntax/LICENSE.md) | [repo](https://github.com/atom/atom/tree/master/packages/one-dark-syntax) | 4 |
| 4 | `nord` | Nord | dark | editor | Nord | Sven Greb | [MIT](https://raw.githubusercontent.com/nordtheme/visual-studio-code/develop/license) | [repo](https://github.com/nordtheme/visual-studio-code) | 5 |
| 5 | `tokyo-night` | Tokyo Night | dark | editor | Tokyo Night | Enkia | [MIT](https://raw.githubusercontent.com/enkia/tokyo-night-vscode-theme/master/LICENSE.txt) | [repo](https://github.com/enkia/tokyo-night-vscode-theme) | 4 |
| 6 | `tokyo-night-storm` | Tokyo Night Storm | dark | editor | Tokyo Night | Enkia | [MIT](https://raw.githubusercontent.com/enkia/tokyo-night-vscode-theme/master/LICENSE.txt) | [repo](https://github.com/enkia/tokyo-night-vscode-theme) | 4 |
| 7 | `catppuccin-mocha` | Catppuccin Mocha | dark | editor | Catppuccin | Catppuccin | [MIT](https://raw.githubusercontent.com/catppuccin/palette/main/LICENSE) | [repo](https://github.com/catppuccin/palette) | 1 |
| 8 | `catppuccin-macchiato` | Catppuccin Macchiato | dark | editor | Catppuccin | Catppuccin | [MIT](https://raw.githubusercontent.com/catppuccin/palette/main/LICENSE) | [repo](https://github.com/catppuccin/palette) | 1 |
| 9 | `catppuccin-frappe` | Catppuccin Frappé | dark | editor | Catppuccin | Catppuccin | [MIT](https://raw.githubusercontent.com/catppuccin/palette/main/LICENSE) | [repo](https://github.com/catppuccin/palette) | 1 |
| 10 | `rose-pine` | Rosé Pine | dark | editor | Rosé Pine | Rosé Pine | [MIT](https://raw.githubusercontent.com/rose-pine/vscode/main/LICENSE) | [repo](https://github.com/rose-pine/vscode) | 2 |
| 11 | `rose-pine-moon` | Rosé Pine Moon | dark | editor | Rosé Pine | Rosé Pine | [MIT](https://raw.githubusercontent.com/rose-pine/vscode/main/LICENSE) | [repo](https://github.com/rose-pine/vscode) | 3 |
| 12 | `gruvbox-dark` | Gruvbox Dark | dark | editor | Gruvbox | morhetz (Pavel Pertsev) | [MIT](https://raw.githubusercontent.com/morhetz/gruvbox/master/README.md) | [repo](https://github.com/morhetz/gruvbox) | 2 |
| 13 | `solarized-dark` | Solarized Dark | dark | editor | Solarized | Ethan Schoonover | [MIT](https://raw.githubusercontent.com/altercation/solarized/master/LICENSE) | [repo](https://github.com/altercation/solarized) | 8 |
| 14 | `monokai-classic` | Monokai Classic | dark | editor | Monokai (TextMate) | Microsoft Corporation | [MIT](https://raw.githubusercontent.com/microsoft/vscode/main/LICENSE.txt) | [repo](https://github.com/microsoft/vscode/tree/main/extensions/theme-monokai) | 4 |
| 15 | `github-dark` | GitHub Dark | dark | editor | GitHub themes | Primer | [MIT](https://raw.githubusercontent.com/primer/github-vscode-theme/main/LICENSE) | [repo](https://github.com/primer/github-vscode-theme) | 0 |
| 16 | `github-dark-dimmed` | GitHub Dark Dimmed | dark | editor | GitHub themes | Primer | [MIT](https://raw.githubusercontent.com/primer/github-vscode-theme/main/LICENSE) | [repo](https://github.com/primer/github-vscode-theme) | 2 |
| 17 | `ayu-dark` | Ayu Dark | dark | editor | Ayu | Ike Kurghinyan | [MIT](https://raw.githubusercontent.com/ayu-theme/vscode-ayu/master/LICENSE) | [repo](https://github.com/ayu-theme/vscode-ayu) | 2 |
| 18 | `ayu-mirage` | Ayu Mirage | dark | editor | Ayu | Ike Kurghinyan | [MIT](https://raw.githubusercontent.com/ayu-theme/vscode-ayu/master/LICENSE) | [repo](https://github.com/ayu-theme/vscode-ayu) | 2 |
| 19 | `night-owl` | Night Owl | dark | editor | Night Owl | Sarah Drasner | [MIT](https://raw.githubusercontent.com/sdras/night-owl-vscode-theme/main/LICENSE.md) | [repo](https://github.com/sdras/night-owl-vscode-theme) | 1 |
| 20 | `palenight` | Palenight | dark | editor | Material Palenight | Olaolu Olawuyi | [MIT](https://raw.githubusercontent.com/whizkydee/vscode-palenight-theme/master/license.md) | [repo](https://github.com/whizkydee/vscode-palenight-theme) | 4 |
| 21 | `everforest-dark` | Everforest Dark | dark | editor | Everforest | sainnhe | [MIT](https://raw.githubusercontent.com/sainnhe/everforest-vscode/master/LICENSE) | [repo](https://github.com/sainnhe/everforest-vscode) | 3 |
| 22 | `kanagawa` | Kanagawa | dark | editor | Kanagawa | Tommaso Laurenzi | [MIT](https://raw.githubusercontent.com/rebelot/kanagawa.nvim/master/LICENSE) | [repo](https://github.com/rebelot/kanagawa.nvim) | 2 |
| 23 | `synthwave-84` | Synthwave '84 | dark | editor | SynthWave '84 | Robb Owen | [MIT](https://raw.githubusercontent.com/robb0wen/synthwave-vscode/master/LICENSE) | [repo](https://github.com/robb0wen/synthwave-vscode) | 1 |
| 24 | `cobalt2` | Cobalt2 | dark | editor | Cobalt2 | Wes Bos, Roberto Achar | [MIT](https://raw.githubusercontent.com/wesbos/cobalt2-vscode/master/LICENSE) | [repo](https://github.com/wesbos/cobalt2-vscode) | 2 |
| 25 | `shades-of-purple` | Shades of Purple | dark | editor | Shades of Purple | Ahmad Awais | [MIT](https://raw.githubusercontent.com/ahmadawais/shades-of-purple-vscode/master/LICENSE.md) | [repo](https://github.com/ahmadawais/shades-of-purple-vscode) | 3 |
| 26 | `poimandres` | Poimandres | dark | editor | Poimandres | drcmda | [MIT](https://raw.githubusercontent.com/drcmda/poimandres-theme/main/LICENSE) | [repo](https://github.com/drcmda/poimandres-theme) | 2 |
| 27 | `github-light` | GitHub Light | light | editor | GitHub themes | Primer | [MIT](https://raw.githubusercontent.com/primer/github-vscode-theme/main/LICENSE) | [repo](https://github.com/primer/github-vscode-theme) | 1 |
| 28 | `solarized-light` | Solarized Light | light | editor | Solarized | Ethan Schoonover | [MIT](https://raw.githubusercontent.com/altercation/solarized/master/LICENSE) | [repo](https://github.com/altercation/solarized) | 13 |
| 29 | `catppuccin-latte` | Catppuccin Latte | light | editor | Catppuccin | Catppuccin | [MIT](https://raw.githubusercontent.com/catppuccin/palette/main/LICENSE) | [repo](https://github.com/catppuccin/palette) | 9 |
| 30 | `rose-pine-dawn` | Rosé Pine Dawn | light | editor | Rosé Pine | Rosé Pine | [MIT](https://raw.githubusercontent.com/rose-pine/vscode/main/LICENSE) | [repo](https://github.com/rose-pine/vscode) | 9 |
| 31 | `gruvbox-light` | Gruvbox Light | light | editor | Gruvbox | morhetz (Pavel Pertsev) | [MIT](https://raw.githubusercontent.com/morhetz/gruvbox/master/README.md) | [repo](https://github.com/morhetz/gruvbox) | 5 |
| 32 | `high-contrast-dark` | High Contrast Dark | dark | accessible | — | Orbit Monitor | MIT | [repo](https://github.com/MatheusChiodi/orbit-monitor) | 0 |
| 33 | `high-contrast-light` | High Contrast Light | light | accessible | — | Orbit Monitor | MIT | [repo](https://github.com/MatheusChiodi/orbit-monitor) | 1 |
| 34 | `oled-black` | OLED Black | dark | accessible | — | Orbit Monitor | MIT | [repo](https://github.com/MatheusChiodi/orbit-monitor) | 0 |
| 35 | `colorblind-deuteranopia` | Color-blind safe: deuteranopia | dark | accessible | — | Orbit Monitor | MIT | [repo](https://github.com/MatheusChiodi/orbit-monitor) | 1 |
| 36 | `colorblind-protanopia` | Color-blind safe: protanopia | dark | accessible | — | Orbit Monitor | MIT | [repo](https://github.com/MatheusChiodi/orbit-monitor) | 1 |
| 37 | `colorblind-tritanopia` | Color-blind safe: tritanopia | dark | accessible | — | Orbit Monitor | MIT | [repo](https://github.com/MatheusChiodi/orbit-monitor) | 0 |

### Adjusted tokens

- `dracula`: `ok`
- `one-dark`: `dim`, `warn`, `syntax.comment`, `syntax.identifier`
- `nord`: `dim`, `warn`, `down`, `syntax.number`, `syntax.comment`
- `tokyo-night`: `muted`, `dim`, `accent`, `syntax.comment`
- `tokyo-night-storm`: `muted`, `dim`, `accent`, `syntax.comment`
- `catppuccin-mocha`: `warn`
- `catppuccin-macchiato`: `warn`
- `catppuccin-frappe`: `ok`
- `rose-pine`: `syntax.keyword`, `syntax.operator`
- `rose-pine-moon`: `muted`, `syntax.keyword`, `syntax.operator`
- `gruvbox-dark`: `ok`, `syntax.keyword`
- `solarized-dark`: `text`, `muted`, `dim`, `ok`, `down`, `syntax.comment`, `syntax.function`, `syntax.identifier`
- `monokai-classic`: `warn`, `down`, `syntax.keyword`, `syntax.operator`
- `github-dark-dimmed`: `muted`, `accent`
- `ayu-dark`: `muted`, `warn`
- `ayu-mirage`: `muted`, `warn`
- `night-owl`: `accent`
- `palenight`: `muted`, `dim`, `accent`, `syntax.comment`
- `everforest-dark`: `muted`, `warn`, `info`
- `kanagawa`: `ok`, `down`
- `synthwave-84`: `ok`
- `cobalt2`: `warn`, `syntax.number`
- `shades-of-purple`: `ok`, `down`, `info`
- `poimandres`: `info`, `syntax.comment`
- `github-light`: `down`
- `solarized-light`: `text`, `muted`, `dim`, `ok`, `warn`, `down`, `syntax.keyword`, `syntax.string`, `syntax.number`, `syntax.comment`, `syntax.function`, `syntax.operator`, `syntax.identifier`
- `catppuccin-latte`: `muted`, `dim`, `ok`, `warn`, `down`, `syntax.string`, `syntax.number`, `syntax.function`, `syntax.operator`
- `rose-pine-dawn`: `muted`, `dim`, `warn`, `info`, `accent`, `syntax.string`, `syntax.number`, `syntax.comment`, `syntax.function`
- `gruvbox-light`: `muted`, `dim`, `ok`, `syntax.string`, `syntax.function`
- `high-contrast-light`: `down`
- `colorblind-deuteranopia`: `ok`
- `colorblind-protanopia`: `ok`
