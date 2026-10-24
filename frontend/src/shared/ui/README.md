# shared/ui — primitives contract (FE-60, FE-61)

Import everything from `@/shared/ui`. All primitives read design tokens (`app/base.css`), work with the keyboard and screen readers, and take a `className` for layout only (margins, width, grid placement).

## Tokens
- Colors (Tailwind): `bg s1 s2 s3 line line-2 text muted dim accent on-accent ok warn down info ok-text warn-text down-text`. `accent` = primary action, focus, links, selection.
- Type: `text-xs .75 · sm .8125 · base .875 · md 1 · lg 1.25 · xl 1.625 · 2xl 2.25` rem (16 px root). Weights 400/500/600. Display face: class `display-wide` (Archivo, page H1, wall hero, KPI numbers). Data: `font-mono` (Geist Mono, tabular). Section label: class `section-label` (the only one).
- Radius: `rounded-sm` 6px controls/chips · `rounded-md` 10px cards/panels/rows · `rounded-lg` 14px dialogs/popovers · `rounded-full` dots/pills only.
- Spacing: Tailwind 4px scale. Panel padding `p-(--panel-padding)`; panel shadow `shadow-panel`; popovers `shadow-popover`.
- Control heights: `h-8` sm, `h-9` md, `pointer-coarse:h-11` on touch.

## Primitives
| Name | Key props | Usage |
|---|---|---|
| `Button` | `variant: primary\|secondary\|ghost\|danger` (`neutral` = secondary, legacy), `size: sm\|md`, `loading`, `iconOnly`, `block`, `ref` | `<Button variant="primary" loading={saving}>Save monitor</Button>` |
| `IconButton` | `label` (required, accessible name), `icon`, `variant` (ghost), `size` | `<IconButton label="Close" icon={IconClose} />` |
| `Field` | `label`, `hint`, `error`, `required`, `id` — wires id/aria to its child control | `<Field label="URL" error={err}><TextInput /></Field>` |
| `TextInput` / `TextArea` | native props + `ref`; TextArea `mono` | `<TextInput placeholder="https://…" />` |
| `Select` | native props + `placeholder` (disabled `""` option) | `<Select placeholder="Choose a group" defaultValue="">…</Select>` |
| `Checkbox` | `label`, `description`, native props | `<Checkbox label="Show on the wall" />` |
| `Switch` | `label`, `description`, `checked`, `onCheckedChange` — applies immediately | `<Switch label="Sound" checked={on} onCheckedChange={set} />` |
| `SegmentedControl` | `label`, `options[{value,label,disabled}]`, `value`, `onChange`, `size` | range pickers, 2–5 short choices |
| `Tabs` | `label`, `items[{value,label,content?}]`, `value`, `onChange` | views of the same thing |
| `Dialog` | `open`, `onClose`, `title`, `description`, `footer`, `size: sm\|md\|lg`, `initialFocus` | confirmations, small forms |
| `Menu` | `label`, `items[{id,label,onSelect,icon,danger,disabled}]`, `trigger?`, `align` | the "…" actions of a row/page |
| `Card` | `title`, `description`, `actions` (static surface, `data-surface="panel"`) | settings groups, forms |
| `Panel` | unchanged API (`title`, `actions`, `tone`, `pulse`, `live`, `surface`) | live blocks; glass only shows on the wall |
| `Table` | `caption`, `columns[{key,header,cell,align,mono,hideOnMobile}]`, `rows`, `getRowKey`, `onRowClick`, `rowLabel`, `empty` | stacks into labelled cards < 640 px |
| `EmptyState` | `icon`, `title`, children (one sentence), `action`, `headingLevel` | one invitation to act |
| `StatusBadge` | `status: OK\|WARN\|DOWN\|INFO\|neutral`, children (label override), `size` | the console's one status rendering |
| `StatusPill` / `StatusDot` | legacy (wall, uppercase) | wall only |
| `Badge` | `tone`, `mono` | neutral chips/counters |
| `Toast` | `useToast().toast({ title, description, tone, action, duration })`; mount `<ToastViewport />` once in the shell | "Monitor saved" |
| `Tooltip` | `content`, single focusable child, `side`, `delay` | supplementary text only |
| `FilePicker` | `accept`, `onFile(file\|null)`, works inside `Field` | config import |
| `PageHeader` | `title`, `description`, `actions`, `eyebrow` | top of every console screen (the h1) |
| `StickyActionBar` | children (actions), `status` | form footer; toasts stay above it |
| icons | `IconPlus`, `IconClose`, `IconMore`, `IconChevronDown/Right/Left`, `IconCheck`, `IconSearch`, `IconBell`, `IconExternal`, `IconAlert`, `IconInfo`, `IconSettings`, `IconUpload`, `IconDownload`, `IconTrash`, `IconEdit`, `IconPause`, `IconPlay`, `IconCopy`, `IconMenu`, `IconArrowLeft`, `IconMonitor`, `IconWall`, `IconFile` — `size 16\|20`, `title` makes it an image | `<IconPlus />` |
| form strings | `INPUT_CLASS`, `SELECT_CLASS`, `TEXTAREA_CLASS`, `LABEL_CLASS` | only where a native control must stay raw |

## Do
- One `primary` button per view; its verb matches the toast ("Save monitor" → "Monitor saved").
- Status color only through `StatusBadge`, `tones.ts` (`DOT_CLASS`, `TEXT_CLASS`, `SOFT_CLASS`) or `Panel tone`.
- Every new string in i18n en + pt-BR; probe values through `<SafeValue>`.
- Put form actions in `StickyActionBar`; secondary actions of a row in `Menu`.

## Don't
- No arbitrary Tailwind values (`text-[..]`, `rounded-[..]`, `p-[..]`, `h-[..]`) in files you touch — use the tokens above; inline `style` only for geometry.
- No `down`/red for non-destructive actions (Acknowledge is `primary`); no decorative gradients or glass in the console.
- No raw `<button>`/`<input>`/`<select>`/`<dialog>` when a primitive exists; no `role="dialog"` hand-rolled.
- Don't select class names in CSS: customization hooks use tokens and `data-surface`.
