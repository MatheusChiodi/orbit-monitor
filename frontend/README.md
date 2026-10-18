# Orbit Monitor — frontend

React 19 + Vite + TypeScript estrito + Tailwind CSS v4 + Motion, TanStack Query e Zustand.
Testes com Vitest + Testing Library (jsdom).

## Rodar

```bash
npm install
npm run dev
# console: http://localhost:5173        parede: http://localhost:5173/wall.html
```

O Vite faz proxy de `/api` e `/ws` para `http://localhost:8080` (backend Spring).
Sem backend, a parede entra sozinha em **dados de demonstração** e o console oferece
**Entrar em modo demonstração**.

Parâmetros da parede: `?cenario=ok` (demonstração sem incidente), `?operador=Nome`
(quem aparece em "X reconheceu às HH:MM"), `?token=…` (token de parede somente leitura).

## Testar

```bash
npm test            # vitest run
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + build dos dois entrypoints
```

## Estrutura

```
src/
  app/        entrypoints (console-main, wall-main), tema e app do console
  domains/
    security/   sessão e login
    workspace/  lista de grupos e monitores
    monitor/    regras, condições, modo seguro do SELECT, formulário SQL/HTTP, Dados e exibição
    wall/       store Zustand, feed (REST + WebSocket), seletores e componentes da parede
  shared/
    api/      tipos do contrato, cliente HTTP tipado e WebSocket /ws/wall
    format/   formatação pt-BR (inteiro, moeda, percentual, duração, data relativa)
    motion/   variantes do Motion (sem mola, deslocamento <= 8 px, reduced motion)
    ui/       Button, Panel, Badge, StatusPill, Sparkline, ThresholdChart (canvas)
```

Um componente por pasta (`Component.tsx`, `Component.test.tsx`, `index.ts`).
