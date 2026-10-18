# Orbit Monitor — frontend

React 19 + Vite + strict TypeScript + Tailwind CSS v4 + Motion, TanStack Query, Zustand and i18next (en / pt-BR).
Tests with Vitest + Testing Library (jsdom).

## Run

```bash
npm install
npm run dev
# console: http://localhost:5173        wall: http://localhost:5173/wall.html
```

Vite proxies `/api` and `/ws` to `http://localhost:8080` (Spring backend).
Without a backend, the wall and the console switch to **demo data** on their own.

There is no login. The console asks once for an **operator name** (kept on this device and sent as
`X-Orbit-Operator`); the API decides whether this client may edit (`edit`) or only view (`view-only`).

Wall parameters: `?lang=pt-BR` (language), `?scenario=ok` (demo without incidents),
`?operator=Name` (who appears in "X acknowledged at HH:MM"). The layout comes from the path (`/wall/noc`).

## Test

```bash
npm test            # vitest run
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + build of both entrypoints
```

## Structure

```
src/
  app/        entrypoints (console-main, wall-main), theme and the console app
  domains/
    security/   operator name, access mode (edit / view-only)
    workspace/  group and monitor list
    monitor/    rules, conditions, SELECT safe mode, SQL/HTTP form, Data & display
    wall/       Zustand store, feed (REST + WebSocket), selectors and wall components
  shared/
    api/      contract types, typed HTTP client and the /ws/wall WebSocket
    format/   locale-aware formatting (integer, currency, percent, duration, relative date)
    i18n/     i18next setup, en / pt-BR locale files, language selector
    motion/   Motion variants (no springs, displacement <= 8 px, reduced motion)
    ui/       Button, Panel, Badge, StatusPill, Sparkline, ThresholdChart (canvas)
```

One component per folder (`Component.tsx`, `Component.test.tsx`, `index.ts`). All UI text lives in
`src/shared/i18n/locales/*.json`.
