---
id: FE-61
title: "UI primitives for the redesign"
area: frontend
group: "Design system"
status: done
screens: [console]
spec: docs/03-design.md
updated: 2026-10-24
---

# FE-61 · UI primitives

## Summary
Token-based, accessible primitives in `shared/ui` that every console screen builds on; contract in `frontend/src/shared/ui/README.md`.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Code
- `frontend/src/shared/ui/{Button,IconButton,Field,TextInput,TextArea,Select,Checkbox,Switch,SegmentedControl,Tabs,Dialog,Menu,Card,Panel,Table,EmptyState,StatusBadge,Toast,Tooltip,FilePicker,PageHeader,StickyActionBar}/`
- `frontend/src/shared/ui/icons/icons.tsx`
- `frontend/src/shared/ui/popover/{roving,focus,anchor}.ts`
- `frontend/src/shared/ui/formStyles.ts`, `frontend/src/shared/ui/locales/{en,pt-BR}.json` (`ui` namespace, also loaded by the wall)
- `frontend/src/shared/ui/README.md`

## Tests
- One focused test per primitive folder (`*.test.tsx`), plus `icons/icons.test.tsx`.

## Decisions and notes
- No new dependency: popovers (Menu, Tooltip) render in a portal with fixed positioning (`popover/anchor.ts`) so panels with `overflow-hidden` never clip them; Dialog is a portal with focus trap, Esc, focus return and backdrop click (native `<dialog>` was not used: jsdom lacks `showModal`). Alternatives considered: Radix UI / Base UI (well maintained, MIT, but extra runtime and a second styling model), lucide-react for icons (fine, but 27 inline icons cover the need with zero dependency).
- Motion via CSS transitions + `@starting-style` (`ui-pop`, `ui-dialog`, `ui-toast` in theme.css), off when `data-animation='off'` or reduced motion.
- Toast is a tiny external store (`showToast`/`useToast`) with one `<ToastViewport />`; it sits at `calc(var(--sticky-bar-height) + 1rem)`, a variable StickyActionBar publishes, so toasts never cover the Save bar.
- StatusBadge is the console status rendering (dot + sentence-case word, only Down pulses); StatusPill/StatusDot stay for the wall.
- Button: `primary | secondary | ghost | danger` (`neutral` kept as alias), `sm | md`, `loading` (aria-busy, spinner drawn in theme.css), `iconOnly`; touch height 44 px via `.ui-control` in theme.css (kept out of the wall bundle).

## Changelog
- 2026-10-24 — primitives, icons, README contract (status: done).
