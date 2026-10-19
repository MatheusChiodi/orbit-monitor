# Orbit Monitor — Customization ("everything is configurable")

Orbit is fully configurable: the operator can change **how things look, how they behave and what they are called**, from a single color to how a card reacts to a click. Defaults are opinionated (the specs in [03-design.md](03-design.md)); every default can be overridden, except a short list of safety guarantees (§7).

## 1. What can be customized

| Area | Examples |
|---|---|
| **Theme and color** | Theme gallery and editor (FE-01 – FE-05), status colors, chart palette, syntax colors, FX gradient |
| **Typography** | Font families (from a bundled set or system fonts), base size, scale ratio, weights, letter spacing, monospace for values on/off |
| **Shape and surface** | Corner radius, border width/style, glass on/off, surface levels, spacing/density, panel padding, shadows (off by default) |
| **Motion** | Animation settings (FE-06): preset, intensity, speed, per-category switches |
| **Cards and components** | Per component type *and* per instance: which fields appear, order, size, variant (compact / regular / detailed), sparkline/chart on/off, value format, unit, color bands, icon, title, subtitle, what a click / double-click / long-press does, hover behavior, expand behavior, badges shown, empty-state text |
| **Names and terminology** | Rename any label in the UI, per language: product terms ("Monitor" → "Check"), states ("DOWN" → "Offline"), section titles ("Near threshold" → "Watch list"), buttons ("Acknowledge" → "I'm on it"), and every monitor, group, field and layout name |
| **Layout and navigation** | Wall layouts (FE-11 – FE-20), console sidebar items (show / hide / reorder / rename), default landing page, panel sizes, column counts |
| **Behavior** | Ordering rules (exceptions first on/off, by name, by severity, manual), grouping, refresh and rotation intervals, what counts as "near threshold", hero rules (what takes the hero, when it splits), incident display rules, toast duration, sound per event |
| **Formats** | Number, currency, percentage, duration and date formats; time zone; 12/24 h; units |
| **Icons and media** | Icon set, per-group/monitor icons, workspace branding (FE-10), sounds |
| **Shortcuts** | Remap every keyboard shortcut |

## 2. How it works — the customization registry

Every customizable thing is declared once in a **registry** with a schema:

```ts
defineSetting({
  id: 'card.monitor.clickAction',
  type: 'enum',
  values: ['open-detail', 'expand', 'acknowledge', 'open-target', 'none'],
  default: 'open-detail',
  scopes: ['workspace', 'device', 'layout', 'instance'],
  category: 'Cards',
  label: 'settings.card.clickAction',   // i18n key
  preview: 'MonitorCardPreview',
})
```

- Types: `boolean`, `enum`, `number` (min/max/step), `color` (token or hex), `font`, `text` (with i18n), `list` (ordered fields), `action` (click/keyboard behaviors), `object` (composed settings).
- Components read settings only through `useSetting(id, { instanceId })`; nothing is hard-coded once it is in the registry.
- The registry generates the **Settings UI** automatically (search, categories, "modified" filter, reset per item, per category and all) and a **JSON view** for power users (like VS Code settings), validated by the same schema.

## 3. Scopes and precedence

Highest wins:

1. **Instance** — one specific card, panel or block (e.g. *this* Reconciliation queue card)
2. **Layout** — one wall layout (e.g. the NOC TV)
3. **Device** — this browser/TV
4. **Workspace** — everyone using this Orbit
5. **Default** — the product defaults

`prefers-reduced-motion` and the safety guarantees (§7) sit above all scopes.

## 4. Customize mode

- A **Customize** toggle (console header, shortcut `Ctrl+.`) turns every component into an editable target: hovering shows an outline and a ⚙ handle.
- Clicking opens an **inspector panel** with tabs **Content · Appearance · Behavior · Names**, showing only the settings that apply to that component.
- Each change asks where to apply: *this item*, *all items of this type*, *this layout*, *this device* or *the workspace*.
- Changes preview live and are undoable (`Ctrl+Z`); nothing is saved until **Save**; **Discard** reverts.
- Works on the wall too (from a device with edit access); view-only clients never see Customize.

## 5. Profiles

A **profile** is a named bundle of settings (e.g. *NOC*, *Executive*, *Payments team*, *Night shift*). Profiles can be applied to a device or a layout, duplicated, exported and imported (JSON, secrets never included). Built-in profiles: *Orbit default*, *TV wall*, *Compact console*, *Accessible*.

## 6. Storage

| Scope | Where |
|---|---|
| Workspace, layout and instance settings, profiles | `orbit.customization.json` (one JSON file per feature rule, [06-configuration-files.md](06-configuration-files.md)) |
| Custom terminology (per locale) | `orbit.terminology.json` |
| Themes | `orbit.themes.json` |
| Device settings | Browser storage on that device (with workspace defaults as fallback) |

All files are schema-validated, versioned, never committed.

## 7. What cannot be turned off (safety guarantees)

Customization never weakens safety, privacy or accessibility:

- **Privacy**: card numbers and sensitive data are always masked (LGPD / PCI DSS, [04-data-protection.md](04-data-protection.md)); no setting can show a full PAN or a secret.
- **SQL and HTTP guards**: read-only SELECT validation, row limits, timeouts and the cloud-metadata block are not customizable from the UI.
- **State is never color-only**: states can be renamed and recolored, but always keep a text label and position; the contrast guard (FE-02) blocks unreadable color combinations and minimum text sizes.
- **Reduced motion**: the OS setting always wins.
- **Access policy**: view-only clients cannot customize.

## 8. Feature IDs

| ID | Feature |
|---|---|
| CORE-21 | Customization registry, `useSetting`, scopes and precedence, generated Settings UI + JSON view (frontend + backend storage) |
| FE-53 | Customize mode with inspector (content, appearance, behavior, names) and apply-scope chooser |
| FE-54 | Terminology editor (rename any label per language, with search and reset) |
| FE-55 | Card and component behavior settings (fields, variants, click/hover/expand actions) |
| FE-56 | Typography, shape and density settings |
| FE-57 | Customization profiles (built-in and custom, export/import) |
| BE-51 | `orbit.customization.json` and `orbit.terminology.json` stores, schemas and APIs |
