# Orbit Monitor — Arquitetura

Stack: **Java 21 + Spring Boot 3** no backend, **React 19 + Vite + TypeScript + Tailwind CSS v4 + Motion** no frontend, **PostgreSQL** como banco do próprio Orbit, **Redis** para fila de execução e cache de estado. Os bancos monitorados (Oracle 11g, Postgres, SQL Server, MySQL) são acessados somente em leitura por conexões dedicadas.

```
┌──────────────┐   HTTPS/WSS   ┌──────────────────────────────────────────────┐
│  Wall / Web  │ ───────────▶  │ Gateway                                      │
│ (React/Vite) │ ◀───────────  │  TLS · rate limit · flag → domínio/subdomínio │
└──────────────┘               └───────────────┬──────────────────────────────┘
                                               ▼
                               ┌──────────────────────────────┐
                               │ Security (domínio principal) │
                               │ HttpClient · AppSecurity     │
                               │ AppRouter · Vault · Audit    │
                               └───────────────┬──────────────┘
                 ┌────────────┬────────────────┼────────────────┬─────────────┐
                 ▼            ▼                ▼                ▼             ▼
            Workspace      Monitor           Probe          Telemetry     Alerting
            grupos/tags    definições     scheduler +      heartbeats     regras,
            layouts        condições      executores       séries, SLA    canais,
                                          (http/sql)       agregações     incidentes
                                               │
                                               ▼
                               ┌──────────────────────────────┐
                               │ Alvos: sites, APIs, bancos   │
                               │ (usuário somente leitura)    │
                               └──────────────────────────────┘
```

## 1. Domínios (backend)

Cada domínio é um módulo Maven próprio (`orbit-<dominio>`), com API interna via interfaces e eventos; nada de chamada entre repositórios de domínios diferentes. Toda request externa entra pelo Gateway com uma **flag** (`X-Orbit-Route: monitor.create`) que o Security valida e o Router despacha.

| Domínio | Subdomínios | Responsabilidade | Tabelas principais |
|---|---|---|---|
| **Security** | auth, rbac, vault, audit | Login, 2FA (TOTP), sessões, papéis por grupo, cofre de credenciais (AES-256-GCM, chave fora do banco via env/KMS), trilha de auditoria de toda mutação | `user`, `role`, `group_member`, `secret`, `audit_log` |
| **Workspace** | group, tag, layout | Grupos, tags, ordem e **layout da parede** (o que aparece, onde e como) | `workspace`, `group`, `tag`, `wall_layout` |
| **Monitor** | http, sql, condition | Definição de cada monitor e das condições de saúde; validação do SELECT; descoberta de colunas | `monitor`, `monitor_http`, `monitor_sql`, `condition`, `connection` |
| **Probe** | scheduler, executor, sandbox | Agenda e executa checagens com isolamento, timeout e circuit breaker por alvo | `probe_run` (curta retenção) |
| **Telemetry** | heartbeat, series, rollup | Guarda resultados, calcula estado com histerese, séries por minuto/hora/dia, uptime e p95 | `heartbeat`, `series_1m`, `series_1h`, `series_1d` |
| **Alerting** | rule, channel, incident, escalation | Abre/fecha incidentes, reconhecimento, escalonamento por tempo, envio por e-mail/Teams/Slack/webhook | `incident`, `incident_event`, `channel`, `escalation_policy` |

### Fluxo de uma checagem

1. `Probe.scheduler` (Quartz ou `@Scheduled` com lock no Redis) enfileira `ProbeJob(monitorId)` no intervalo do monitor.
2. Um `ProbeExecutor` (pool de virtual threads do Java 21) pega o job e chama `HttpProbe` ou `SqlProbe`.
3. O executor devolve `ProbeResult { status, latencyMs, payload, error }`.
4. `Telemetry` grava o heartbeat, avalia as **condições**, aplica histerese e emite `MonitorStateChanged` se mudou.
5. `Alerting` reage ao evento: abre incidente, dispara canais, inicia o relógio de escalonamento.
6. O Gateway publica o novo estado pelo **WebSocket** `/ws/wall`; a parede atualiza sem polling.

### Probe SQL (o coração do produto)

```
SELECT recebido ──▶ Parser (JSqlParser) ──▶ aceita só SELECT/WITH, sem ; múltiplo,
                                           sem DML/DDL/CALL/EXEC, sem DBMS_*/pg_sleep
            ──▶ Wrapper: SELECT * FROM (<sql>) WHERE ROWNUM <= :max   (Oracle)
                         SELECT * FROM (<sql>) t LIMIT :max           (Postgres/MySQL)
            ──▶ Executa com statement timeout + fetchSize + usuário READ ONLY
            ──▶ ResultSetMetaData → colunas, tipos → ResultPayload {columns, rows, ms}
```

* Cada **Connection** (alvo) tem pool próprio (HikariCP, max 2–3) para o monitor nunca esgotar o banco que observa.
* Circuit breaker (Resilience4j) por alvo: 3 falhas seguidas = pausa de 1 min com estado "sem resposta".
* Anti-SSRF no `HttpProbe`: resolve DNS e bloqueia faixas privadas e metadata de nuvem, salvo allowlist por workspace.

### Avaliação de condições

Condições são expressões curtas avaliadas sobre o resultado, no estilo Gatus:

```
[STATUS] == 200
[RESPONSE_TIME] < 800ms
[BODY].status == "UP"            (JSONPath)
[ROWS] == 0
[COL].QTD_PENDENTES < 50
[COL].ULT_LOTE > now() - 60min
[EXEC_TIME] < 2s
```

Implementadas como pequenos `ConditionEvaluator` registrados num `Map<Operator, Evaluator>`, sem engine de script. Estado resultante: `OK`, `WARN` (latência/limite brando), `DOWN` (condição crítica falhou ou sem resposta). Histerese configurável (padrão 10%) para sair de WARN.

## 2. Frontend

```
src/
  app/            roteamento, providers, tema
  domains/
    security/     login, 2FA, guarda de rotas
    workspace/    grupos, tags, editor de layout da parede
    monitor/      formulários HTTP e SQL, preview de SELECT, condições
    telemetry/    gráficos, séries, uptime
    alerting/     incidentes, reconhecimento, canais
    wall/         a tela de parede (herói, folga, matriz, linha do tempo)
  shared/
    ui/           Button, Panel, Badge, Sparkline, ThresholdChart…
    api/          cliente HTTP tipado (openapi-typescript) + WebSocket
    motion/       variantes e transições do Motion
```

* **Componente por pasta** (`Component/Component.tsx`, `.test.tsx`, `index.ts`), arquivos até 400 linhas, TypeScript estrito sem `any`.
* Estado de servidor com **TanStack Query**; estado da parede em um store leve (Zustand) alimentado pelo WebSocket.
* Gráficos com canvas próprio para o herói (como no protótipo) e **Recharts** nas telas de análise.
* **Motion** (ex-Framer Motion) só onde comunica estado: troca de herói com `layoutId`, entrada de incidente, pulso de "fora do ar". `prefers-reduced-motion` respeitado.
* Build Vite com dois entrypoints: `index.html` (console) e `wall.html` (parede, sem dependências de edição, carrega em < 150 KB gzip).

## 3. Segurança (resumo)

* JWT curto + refresh em cookie `HttpOnly`; 2FA obrigatório para papéis que editam monitores.
* RBAC por grupo: `viewer`, `operator` (reconhece incidentes), `editor` (cria monitores), `admin`.
* Segredos nunca voltam na API; o front só vê `•••• (cofre)`.
* Usuário de banco do Orbit em cada alvo: `GRANT SELECT` apenas nas views/tabelas necessárias; recomendado criar uma **view por consulta** no banco alvo para consultas pesadas.
* Auditoria: quem criou/alterou cada SELECT, com diff.
* Tela de parede: token próprio, somente leitura, sem dados pessoais de clientes.

## 4. Execução local (sem Docker, sem publicação)

Por enquanto o Orbit roda só na sua máquina. Para isso a arquitetura acima fica **sem Redis e sem Postgres**, trocados por peças embutidas, sem mudar o código dos domínios (apenas a implementação das portas):

| Peça | Produção futura | Local agora |
|---|---|---|
| Banco do Orbit | PostgreSQL | **H2 em arquivo** (`~/.orbit/orbit.mv.db`) ou SQLite via driver JDBC; mesmo schema Flyway |
| Fila de execução | Redis | `BlockingQueue` em memória + `@Scheduled` com lock local |
| Cache de estado | Redis | Caffeine em memória |
| Tempo real | WebSocket via Gateway | WebSocket embutido no mesmo processo (`ws://localhost:8080/ws/wall`) |
| Front | Nginx servindo o build | `vite dev` em `localhost:5173` com proxy para `:8080`; ou o Spring servindo o `dist/` em `static/` |

Como rodar:

```bash
# backend
cd orbit-api && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# frontend (outro terminal)
cd orbit-web && npm install && npm run dev
# console: http://localhost:5173    parede: http://localhost:5173/wall.html
```

* Perfil `local` em `application-local.yml`: H2, segredos do cofre com chave gerada na primeira execução e guardada em `~/.orbit/master.key`, 2FA desligado, usuário admin criado no primeiro acesso.
* Drivers JDBC dos bancos alvo (`ojdbc11` para Oracle 11g, `postgresql`, `mssql-jdbc`) já no `pom.xml`; a conexão de cada alvo é cadastrada pela interface.
* Um único jar executável (`./mvnw package` → `java -jar orbit-api.jar`) serve também o front buildado, para deixar a TV apontando só para `http://<sua-máquina>:8080/wall.html` na rede interna.
* Migrações com Flyway. OpenAPI gerado pelo springdoc e consumido pelo front na build.
* O Orbit monitora a si mesmo: `/actuator/health` é o primeiro monitor.
* Testes: JUnit 5 com H2 no backend (Testcontainers com Oracle XE só quando houver Docker); Vitest + Testing Library no front; Playwright na parede. TDD como regra.
* Commits no padrão Conventional Commits.

Quando for publicar, basta ativar o perfil `prod` (Postgres + Redis) e empacotar; nenhum domínio muda.
