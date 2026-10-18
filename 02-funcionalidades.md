# Orbit Monitor — Funcionalidades

Princípio: **o operador escreve o que quer observar e o Orbit descobre o resto.** Colou um SELECT, o sistema reconhece as colunas; colou uma URL, o sistema faz o request e mostra a resposta; a partir daí o operador **escolhe quais dados guardar e como cada um aparece** (número, medidor, gráfico, tabela, semáforo), e o que vira alerta.

## 1. Workspace e grupos

* **Workspace** por empresa/ambiente (`Produção`, `Homologação`), cada um com sua parede, seus usuários e seus canais.
* **Grupo** = um sistema ou um time (`Pagamentos`, `Portal do Cliente`, `Banco Core`). Reúne monitores de qualquer tipo.
* Campos: nome, cor, ícone, descrição, responsável (pessoa ou time), tags, política de escalonamento padrão.
* **Dependências entre grupos e monitores** (`API de autenticação` → `Portal web`, `Checkout`). Usadas para mostrar o raio de impacto e para **suprimir alertas em cascata**: se o barramento caiu, os 12 monitores que dependem dele viram um único incidente.
* Estado do grupo = pior estado dos seus monitores. Janelas de **manutenção** agendadas silenciam o grupo e não contam no uptime.
* Importar/exportar grupo em YAML (monitoramento como código, para versionar no Git).

## 2. Monitores

Tipos na primeira versão: **HTTP**, **SQL**, **Ping/TCP** e **Push** (o sistema avisa o Orbit que está vivo; útil para jobs batch). Todos compartilham:

* Nome, grupo, tags, intervalo (15 s a 24 h), timeout, tentativas antes de marcar fora, histerese.
* **Condições de saúde** com dois níveis: *atenção* (WARN) e *fora* (DOWN).
* Janela de execução opcional ("só em horário comercial", "só dias úteis").
* Histórico, uptime 24 h/7 d/30 d, p50/p95, lista de incidentes.
* Pausar, duplicar, testar agora.

### 2.1 Monitor HTTP (sites e APIs)

* Método, URL, headers, body (JSON/form), autenticação (Basic, Bearer, API key, OAuth2 client credentials com renovação automática). Segredos vão para o cofre.
* Seguir redirecionamentos, ignorar TLS inválido (com aviso), proxy por workspace.
* **Testar agora** mostra status, tempo, headers e body formatado.
* Condições sobre `[STATUS]`, `[RESPONSE_TIME]`, `[BODY]` (JSONPath ou texto contém), `[HEADER].x`, `[CERT_DAYS_LEFT]`.
* **Extração de métricas do body**: `$.fila.tamanho` vira uma série numérica com gráfico e regra própria, sem precisar de outro monitor.
* Verificação de certificado e de domínio embutida (aviso 30/14/7 dias antes de vencer).

### 2.2 Monitor SQL (consultas no banco)

Este é o diferencial. O fluxo do usuário:

1. Escolhe a **conexão** (cadastrada por um admin: Oracle, Postgres, SQL Server, MySQL; usuário somente leitura; credencial no cofre; teste de conexão no cadastro).
2. Cola o SELECT no editor (com destaque de sintaxe e autocompletar de tabelas/colunas lidas do catálogo do banco).
3. Clica **Executar preview**. O Orbit valida (só SELECT), executa com timeout e limite de linhas e mostra o resultado em tabela **com os tipos detectados** de cada coluna.
4. Escolhe o **modo de leitura** do resultado, sugerido automaticamente:

| Resultado | Sugestão automática | O que vira |
|---|---|---|
| 1 linha, 1 coluna numérica | **Valor único** | Um número grande com gráfico de tendência |
| 1 linha, N colunas | **Cartão de indicadores** | N números rotulados (ex.: `PENDENTES`, `ERRO`, `OK`) |
| N linhas, coluna de categoria + número | **Ranking / barras** | Barras por categoria (ex.: erros por adquirente) |
| N linhas com coluna de data | **Série temporal** | Linha no tempo a partir do próprio resultado |
| N linhas, qualquer formato | **Tabela** | Tabela ao vivo (ex.: transações travadas, com ID e minutos) |
| 0 ou N linhas | **Contagem de linhas** | `[ROWS]` como métrica (ex.: locks bloqueantes = 0) |

5. Define as **condições** por coluna, com operadores `<, <=, >, >=, ==, !=, between, in`, e para datas `older than 10min`. Pode ter várias; cada uma com nível (atenção/fora).
6. Opcional: **parâmetros** no SELECT (`:dias`, `:loja`) com valores fixos ou vindos de variáveis do workspace, e **enriquecimento** (rotular coluna, formatar como moeda/percentual/duração, ocultar coluna na parede).

Funcionalidades adicionais do SQL:

* **Comparação com histórico**: condição "valor 50% acima da média da última semana no mesmo horário" (detecção de anomalia simples, sem ML).
* **Consultas pesadas** recebem aviso de custo (tempo do preview) e sugestão de intervalo maior ou de view materializada.
* **Catálogo de consultas** por conexão: SELECTs salvos e reutilizáveis entre monitores, com dono e descrição.
* **Modo seguro**: lista negra de funções (`DBMS_*`, `UTL_*`, `pg_sleep`, `xp_cmdshell`), limite de linhas, timeout, uma consulta por vez por conexão.
* Auditoria com diff de cada alteração de SELECT.

### 2.3 Escolher os dados e como exibi-los (vale para HTTP e SQL)

Todo monitor, depois do preview, abre o passo **Dados e exibição**. O Orbit lista tudo que veio na resposta e você marca o que quer guardar e como quer ver.

**Passo 1: escolher os dados.**
O resultado é apresentado como uma lista de campos:

* SQL: cada coluna do SELECT, com tipo detectado (`QTD_PENDENTES · número`, `DT_ULT_LOTE · data`, `STATUS · texto`), mais os campos de sistema `[ROWS]` e `[EXEC_TIME]`.
* HTTP: a árvore do JSON da resposta (`$.status`, `$.fila.tamanho`, `$.itens[*].valor`), mais `[STATUS]`, `[RESPONSE_TIME]`, `[CERT_DAYS_LEFT]` e headers.

Para cada campo marcado você define: **rótulo** (como vai aparecer na tela: "Pendentes" em vez de `QTD_PENDENTES`), **formato** (inteiro, decimal, moeda, percentual, duração, data relativa "há 12 min", texto), **unidade** e se ele é **guardado como série** (vira histórico e gráfico) ou só exibido no momento. Campos não marcados não são armazenados, o que mantém o banco do Orbit pequeno e evita guardar dado sensível por acidente.

**Passo 2: escolher a exibição.**
Cada campo (ou o monitor inteiro) recebe um **modo de exibição**, com sugestão automática pelo formato do resultado e troca livre:

| Modo | Quando faz sentido | O que mostra |
|---|---|---|
| **Número** | um valor numérico | número grande, unidade, seta de tendência e sparkline |
| **Medidor** | valor com limite claro | barra de folga até a regra (como "Perto do limite") |
| **Indicadores** | várias colunas numa linha | cartão com N números rotulados |
| **Gráfico de linha** | campo guardado como série | últimos 60 min / 24 h com linha de limite |
| **Barras / ranking** | categoria + número | barras ordenadas (ex.: erros por adquirente) |
| **Tabela** | várias linhas | colunas escolhidas, ordenação, limite de linhas, destaque de linhas que violam regra |
| **Texto / estado** | campo de texto | pílula colorida por mapeamento (`"UP"` → verde, `"DEGRADED"` → âmbar) |
| **Semáforo** | só precisa saber se está ok | ponto verde/âmbar/vermelho com o rótulo |
| **Oculto** | usado só em condição | não aparece na parede, mas entra nas regras |

Por exibição ainda dá para definir **faixas de cor** por valor (`< 50` verde, `50–200` âmbar, `> 200` vermelho), casas decimais, prefixo/sufixo, e **o que aparece quando a regra falha** (ex.: o número vira vermelho e mostra "+75% do limite").

**Passo 3: onde aparece.** O mesmo campo pode aparecer em mais de um lugar com modos diferentes: na matriz como semáforo, num bloco da parede como gráfico, no card do grupo como número. A escolha fica no monitor; a posição fica no layout da parede (seção 3).

Exemplo completo: SELECT que devolve `ADQUIRENTE, QTD_ERRO, PCT_ERRO, ULT_ERRO`. Você marca os quatro, rotula `PCT_ERRO` como "Taxa de erro" em percentual com uma casa, guarda `QTD_ERRO` como série, exibe o conjunto como **ranking por adquirente** na parede e como **número** (soma de `QTD_ERRO`) na matriz, e cria a regra `PCT_ERRO > 2` = atenção, `> 5` = fora.

### 2.4 Ping/TCP e Push

* Ping ICMP e porta TCP para servidores, bancos e filas.
* Push: o Orbit gera uma URL; o job chama ao terminar. Regra "sem sinal há mais de X minutos = fora". Resolve o monitoramento de rotinas batch e integrações noturnas.

## 3. Parede (modo TV) configurável

O usuário monta **o que aparece, onde e como**, sem código:

* **Layouts** salvos por workspace: `NOC`, `Diretoria`, `Time de Pagamentos`. Cada TV abre um layout por URL (`/wall/noc?token=…`).
* **Blocos disponíveis**: Situação (herói automático), Também ativos, Perto do limite, Matriz de monitores, Linha do tempo, Valor único, Cartão de indicadores, Gráfico de série, Tabela ao vivo, Ranking, Uptime do grupo, Relógio/turno de plantão, Texto livre.
* Editor de grade por arrastar e soltar (12 colunas), com preview em 1080p e 4K.
* Por bloco: fonte de dados (monitor/grupo e **qual campo**), modo de exibição (herda o definido no monitor ou sobrescreve só nesse layout), período, título, tamanho.
* **Comportamento automático** ativável por layout: "quando houver incidente, o herói ocupa 50% da tela e os blocos de menor prioridade se escondem"; "quando tudo estiver verde, mostrar os indicadores de negócio". É o que diferencia a parede de um dashboard comum.
* Modo noturno (menos brilho) por horário; som de alerta opcional; rotação entre layouts a cada N segundos.
* Token de parede somente leitura, revogável, sem expor nada além do que o layout mostra. Rodando local, a TV aponta para `http://<sua-máquina>:8080/wall.html` na rede interna.

## 4. Incidentes e alertas

* Incidente abre quando um monitor entra em *fora* (ou *atenção*, se configurado) e fecha sozinho na recuperação, com duração e causa registradas.
* **Reconhecer** (com nome e hora), comentar, vincular a um chamado externo (número do ticket).
* **Escalonamento**: política por grupo, ex.: 0 min → canal do time; 15 min sem reconhecimento → gestor; 30 min → diretoria. Visível em contagem regressiva na parede.
* Canais: e-mail, Microsoft Teams, Slack, Telegram, webhook genérico, WhatsApp via provedor. Mensagem já traz o valor que violou a regra e o link do incidente.
* **Supressão inteligente**: cascata por dependências, janela de manutenção, agrupamento de alertas iguais em 5 min, silenciar por X horas com motivo.
* Relatório pós-incidente gerado automaticamente (linha do tempo, quem reconheceu, tempo até reconhecer e até resolver).

## 5. Relatórios e análise

* Uptime por grupo e por monitor (24 h, 7 d, 30 d, mês fechado), exportável em PDF/CSV para SLA.
* Tempo médio de reconhecimento e de resolução por time.
* Comparativo semana a semana das séries SQL (ex.: fila de conciliação).
* **Página de status pública/interna** opcional, gerada a partir de grupos escolhidos.

## 6. Administração

* Usuários e papéis por grupo (viewer, operator, editor, admin). 2FA obrigatório para editor e admin (desligado no perfil local). SSO (Google/Microsoft) na versão seguinte.
* Conexões de banco e segredos geridos só por admin; teste de conexão; rotação de senha sem recriar monitores.
* Trilha de auditoria completa, filtrável.
* Retenção configurável: heartbeats brutos 7 dias, agregados por minuto 90 dias, por hora 2 anos.
* Backup/export do workspace em YAML; importação de monitores do Uptime Kuma.

## 7. Roadmap sugerido

1. **MVP (6–8 semanas)**: Security básico + 2FA, grupos, monitor HTTP e SQL com preview e condições, Telemetry, incidentes com reconhecimento, canais e-mail/Teams/webhook, parede com layout fixo (o protótipo).
2. **v1.1**: editor de layout da parede, blocos de valor/tabela/ranking, dependências e supressão em cascata, escalonamento, Push e Ping.
3. **v1.2**: anomalia por histórico, catálogo de consultas, relatórios de SLA, página de status, importação do Uptime Kuma, SSO.
