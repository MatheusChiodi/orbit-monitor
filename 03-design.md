# Orbit Monitor — Design

Objetivo: alguém a 3 metros da TV sabe em **um segundo** se há problema, **onde** e **há quanto tempo**; em cinco segundos sabe **o que fazer**. Todo o resto do sistema (console de edição) herda a mesma linguagem, com densidade maior.

## 1. Princípios

1. **A tela muda de forma conforme a gravidade.** Verde: calma e indicadores de negócio. Problema: o pior incidente ocupa metade da tela. Nunca uma grade estática com 40 quadrinhos iguais.
2. **Exceções primeiro.** O que está normal fica pequeno e quieto; o que precisa de ação fica grande e com a regra escrita (`QTD = 347 · regra QTD < 200`).
3. **Cor só com significado.** Vermelho = fora, âmbar = atenção, verde = ok, azul = informativo. Nada decorativo colorido. Estado nunca depende só de cor: sempre vem com rótulo (`FORA`) e posição.
4. **Legível de longe.** Nenhum texto abaixo de 0,65 rem (≈12 px num 1080p); valores em monoespaçada tabular para não "pular" quando mudam.
5. **Movimento comunica, não decora.** Pulso só em incidente sem responsável; transição de layout quando o herói troca; nada gira, nada flutua. `prefers-reduced-motion` desliga tudo.
6. **Zero scroll na parede.** Tudo cabe em 16:9. Em notebook e celular, a mesma tela vira página rolável.

## 2. Tokens

### Cores

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#07090d` | Fundo da parede |
| `--s1` / `--s2` / `--s3` | `#0d1117` / `#121820` / `#182029` | Superfícies em três níveis |
| `--line` / `--line-2` | `rgba(255,255,255,.07)` / `.13` | Bordas e divisórias |
| `--text` / `--muted` / `--dim` | `#eef2f7` / `#8b96a6` / `#5a6575` | Três níveis de texto |
| `--ok` | `#22c55e` | Operacional |
| `--warn` | `#f5a524` | Atenção |
| `--down` | `#ff3b4f` | Fora |
| `--info` | `#3b9eff` | Informativo, foco, marca |

Fundos de estado usam a cor com 10–16% de opacidade em gradiente vertical (forte em cima, some embaixo). Bordas de estado a 45–70%. Texto sobre fundo de estado usa variantes claras (`#ffb3ba`, `#ffd48a`, `#a9f0c3`).

Contraste mínimo 4,5:1 em texto corrido e 3:1 em rótulos grandes, verificado nas três cores sobre `--s1`.

### Tipografia

* **Inter Tight** (600–800) para títulos e números-manchete: condensada o suficiente para nomes longos caberem em uma linha.
* **Inter** (400–600) para texto.
* **Geist Mono** (400–600) para valores, horários, regras e tudo que muda com frequência. Sempre `font-variant-numeric: tabular-nums`.

Escala (rem, base fluida):

| Papel | Tamanho | Exemplo |
|---|---|---|
| Manchete | 2.4 rem | Nome do incidente, "Tudo operacional" |
| Valor principal | 1.5 rem | `349 QTD` |
| Relógio / tempo decorrido | 1.05–1.25 rem | `há 4min 01s` |
| Título de linha | .88–.9 rem | Nome de monitor em listas |
| Corpo / regra | .78–.85 rem | `regra QTD < 200` |
| Rótulo de seção | .68 rem, caixa alta, espaçamento .12em | `PERTO DO LIMITE` |
| Mínimo | .62 rem | Siglas e eixos |

### Base fluida

`html { font-size: clamp(12px, .7vw + .45vh, 36px) }` — 1080p ≈ 18 px, 1440×900 ≈ 14 px, 4K ≈ 36 px. Todo o layout em `rem`, logo a parede escala para qualquer TV sem retoque.

### Espaço e forma

* Grade de 0.8 rem entre painéis; padding interno 0.9 rem; raio 0.9 rem nos painéis, 0.4–0.5 rem em células e botões.
* Sem sombras na parede (fundo escuro uniforme); profundidade vem dos três níveis de superfície e das bordas.
* Barra lateral de 0.35 rem na cor do estado no painel herói, sinal reconhecível até de canto de olho.

## 3. Anatomia da parede (1080p)

```
┌ cabeçalho (3.2rem) ─ marca · ambiente · [estado global] · contagens ······ atualizado · relógio · tela cheia ┐
├───────────────────────────────────────────────┬─────────────────────────────────────────┤
│ SITUAÇÃO (herói)                       ~57%   │ TODOS OS MONITORES               ~60%   │
│ sev · grupo · tipo ············ há 4min 01s   │ grupo │ célula │ célula │ célula        │
│ Nome do incidente (2.4rem)                    │ grupo │ célula │ célula                 │
│ 349 QTD  regra QTD < 200  [+75% do limite]    │ …                                       │
│ ┌ gráfico 60 min com linha de limite ───────┐ ├─────────────────────────────────────────┤
│ └───────────────────────────────────────────┘ │ LINHA DO TEMPO                   ~40%   │
│ Impacto provável [chips] ··· escalona em · [Reconhecer] │ hh:mm:ss ● título / detalhe   │
├───────────────────────┬───────────────────────┤                                         │
│ TAMBÉM ATIVOS         │ PERTO DO LIMITE       │                                         │
│ lista curta           │ barras de folga       │                                         │
└───────────────────────┴───────────────────────┴─────────────────────────────────────────┘
```

Proporção de colunas 1.5 : 1. Esquerda é **ação** (o que fazer agora e o que vem a seguir); direita é **contexto** (tudo e o histórico).

### Componentes

**Estado global (cabeçalho).** Pílula com ponto + frase curta (`1 monitor fora`, `2 em atenção`, `Tudo operacional`). Ponto pisca só em vermelho. Ao lado, três contadores `1 fora · 2 atenção · 17 ok`. O título da aba repete a contagem: `(3) Orbit`.

**Herói.** Quatro faixas: identificação; nome + valor + regra + desvio; gráfico; rodapé com impacto e reconhecimento. Quando não há problema: círculo verde com ondas lentas, "Tudo operacional", disponibilidade 24 h, última recuperação, quantos monitores estão perto do limite.

**Gráfico de limite.** Linha fina na cor do estado, limite tracejado branco a 45%, área entre linha e limite preenchida a 16–18% quando violada, ponto no valor atual, buracos vermelhos translúcidos onde não houve resposta. Eixo com cinco marcas (`-60min … agora`), grade a 5%.

**Perto do limite.** Barra horizontal de folga (verde; âmbar abaixo de 25%), valor atual e regra em mono, percentual grande à direita. Ordenada da menor folga para a maior, cinco itens.

**Matriz.** Nome do grupo à esquerda com `3/4 ok · ATENÇÃO`; células de 8.4 rem em três colunas: ponto de estado, nome, valor em mono. Células com problema sobem para o início e mudam fundo e borda; vermelhas sem responsável piscam suavemente.

**Linha do tempo.** Horário em mono, ponto colorido, título em negrito, detalhe em mono. Evento novo recebe um fundo azul que esvanece em 3 s. Reconhecimentos entram em azul (informativo), não em verde.

**Reconhecer.** Único botão de ação na parede. Vermelho sólido quando o incidente é *fora*, neutro quando é *atenção*. Depois de clicado vira texto: `M. Chiodi reconheceu às 17:04`.

## 4. Movimento (Motion)

| Momento | Animação | Duração |
|---|---|---|
| Troca do herói | `layoutId` compartilhado; antigo sai com fade/escala .98, novo entra com fade/escala 1 | 350 ms, ease-out |
| Novo incidente na matriz | célula muda de cor com transição de fundo e borda | 400 ms |
| Incidente sem responsável | piscar de opacidade na barra lateral e na célula, 1.4 s, infinito | – |
| Novo evento na linha do tempo | fundo azul 16% → 0 | 3 s |
| Tudo operacional | anel verde expandindo e sumindo | 2.6 s, infinito |
| Contadores e valores | sem animação de número; trocam no lugar (tabular) | – |

Nada com mola, nada com deslocamento maior que 8 px. Tudo desligado em `prefers-reduced-motion`.

## 5. Console de edição

Mesmos tokens, densidade maior (`font-size` 14–15 px), tema escuro por padrão com tema claro disponível. Padrões:

* Formulário em duas colunas: configuração à esquerda, **preview ao vivo** à direita (request executado, resultado do SELECT em tabela com tipos detectados).
* Editor SQL com destaque, autocompletar e os "guardas" visíveis (`Somente SELECT · Timeout 5s · Máx. 500 linhas · Credencial no cofre`).
* Condições em linhas `campo · operador · valor · nível`, com validação instantânea contra o preview ("essa condição falharia agora").
* Editor de layout da parede: grade de 12 colunas, blocos arrastáveis, preview em 1080p/4K e simulador "e se houver incidente".

## 6. Responsivo

| Largura | Comportamento |
|---|---|
| ≥ 1100 px e 16:9 | Parede completa sem scroll, fonte fluida |
| < 1100 px ou proporção ≥ 4:3 | Uma coluna, scroll, fonte fixa 14 px, gráfico com 12 rem de altura, matriz em lista |
| Celular | Herói, Também ativos, Perto do limite, Matriz, Linha do tempo nessa ordem; botão Reconhecer em largura total |

## 7. Acessibilidade

* Estado sempre com texto, nunca só cor.
* Contraste verificado (ver tokens); foco visível em azul; botões com 2.2 rem de altura.
* `aria-live="polite"` na faixa de estado e no herói para leitores de tela.
* Tela cheia pela API do navegador; sem dependência de mouse na parede.

## 8. Nome e identidade

* Marca: **Orbit**. Símbolo: anel em gradiente azul→verde com núcleo escuro. Sem mascote, sem 3D.
* Tom de voz das mensagens: curto, factual, em português, sem exclamação. `Fila de conciliação fora do ar · QTD = 347 · regra QTD < 200`.
