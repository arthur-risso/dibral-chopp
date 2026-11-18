---
name: Dibral Chopp
description: Gestão de reservas, estoque e compra de chopp da Dibral, desenhada como uma parede de azulejo de boteco.
colors:
  porcelain: "#f3f5f1"
  tile: "#ffffff"
  grout: "#d3dad3"
  grout-strong: "#aebaaf"
  ink: "#14241e"
  ink-2: "#3d5047"
  ink-3: "#5a6b62"
  bottle-green: "#12503e"
  bottle-green-deep: "#0c3a2d"
  green-tint: "#e0ece5"
  orange: "#d9532c"
  orange-ink: "#a63a19"
  orange-tint: "#fbebe4"
  tile-blue: "#2b5fa8"
  blue-tint: "#e5edf8"
  ok: "#1b6b45"
  ok-tint: "#dcefe3"
  danger: "#b3261e"
  danger-tint: "#fbe5e2"
  brand-antarctica: "#2f6fb5"
  brand-brahma: "#c23b2e"
  brand-black: "#3b3050"
  brand-stella: "#b8860b"
  brand-colorado: "#9a5314"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 700
    lineHeight: 1.45
  numeral:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
  body:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.45
  tag:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.01em"
rounded:
  sm: "2px"
  chip: "1px"
spacing:
  gap: "16px"
  cell-x: "14px"
  panel-x: "20px"
  page-x: "36px"
  page-y: "28px"
  rail: "232px"
components:
  button-primary:
    backgroundColor: "{colors.bottle-green}"
    textColor: "{colors.tile}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.bottle-green-deep}"
  button-default:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-default-hover:
    backgroundColor: "{colors.green-tint}"
  input:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "40px"
  segmented-active:
    backgroundColor: "{colors.bottle-green}"
    textColor: "{colors.tile}"
    height: "38px"
    padding: "0 16px"
  nav-item:
    textColor: "#e3eee8"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 16px"
  nav-item-active:
    backgroundColor: "{colors.porcelain}"
    textColor: "{colors.bottle-green-deep}"
  panel:
    backgroundColor: "{colors.tile}"
    rounded: "{rounded.sm}"
    padding: "18px 20px"
  grid-cell:
    backgroundColor: "{colors.tile}"
    height: "44px"
    width: "112px"
  grid-cell-reserved:
    backgroundColor: "{colors.blue-tint}"
  grid-cell-delivered:
    backgroundColor: "{colors.ok-tint}"
  grid-code-cell:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.bottle-green-deep}"
  grid-totals:
    backgroundColor: "{colors.bottle-green}"
    textColor: "{colors.tile}"
  tag-warn:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.orange-ink}"
    rounded: "{rounded.sm}"
    height: "22px"
    padding: "0 8px"
---

# Design System: Dibral Chopp

## Overview

**Creative North Star: "Azulejo de Boteco"**

Uma parede de boteco azulejada: porcelana clara, azulejos brancos quadrados separados por rejunte fino, uma faixa verde-garrafa que segura a casa. Cada tela é lida como uma parede de azulejos, onde a grade de reservas é o caso extremo e todas as outras tabelas (estoque, sugestão, clientes, fechamento) usam o mesmo rejunte. A ferramenta é de uma pessoa só, no desktop, com luz de escritório; o tom é de balcão competente, sem enfeite de SaaS.

A cor trabalha pouco e por função. Verde-garrafa é a estrutura (barra lateral, ação principal, linha sob o título, totais, estado selecionado de controles segmentados). Laranja é reservado para seleção, foco e atenção. Azul de azulejo, verde-ok e cinza contam o estado das células. As cores das marcas de chopp aparecem só como a faixa que encabeça cada coluna de produto e como pontinho quadrado ao lado do nome.

O código do cliente vem antes do nome, em numeral condensado grande sobre um azulejo tingido de verde. Os números são sempre tabulares e alinhados.

**Key Characteristics:**
- Cantos quase retos (2px), bordas de 1px de rejunte, nenhuma sombra suave nas superfícies.
- Barlow para texto e Barlow Semi Condensed para títulos e numerais.
- Laranja escasso: só seleção, foco e atenção.
- Padrão de azulejo hidráulico só no pé da barra lateral e no login.
- Logo: espaço reservado com nome em texto; nenhum símbolo inventado.

## Colors

Porcelana, branco e dois tons de rejunte para a superfície; verde-garrafa para a estrutura; laranja, azul e verde de estado para o que precisa de atenção.

### Primary
- **Verde-garrafa** (`{colors.bottle-green}`): barra lateral, botão primário, linha de 3px sob o título da página, linha de totais pinada da grade, botão selecionado em controle segmentado, cabeçalho do modal, barra de estoque normal.
- **Verde-garrafa profundo** (`{colors.bottle-green-deep}`): hover do botão primário, azulejos escuros do padrão, texto do item ativo da navegação e do código do cliente, células de rótulo da linha de totais.
- **Verde-névoa** (`{colors.green-tint}`): azulejo do código na grade, células numéricas de tabelas, hover de botões secundários e de ícones.

### Secondary
- **Laranja-de-seleção** (`{colors.orange}`): anel de foco (2px, 3px dentro das células da grade), linha selecionada, seleção de texto, preenchimento da barra de estoque baixo, losango do padrão.
- **Laranja-tinta** (`{colors.orange-ink}`): texto de alerta e hover de links; **Laranja-névoa** (`{colors.orange-tint}`): fundo de etiqueta de aviso, linha selecionada, célula numérica em alerta.

### Tertiary
- **Azul-azulejo** (`{colors.tile-blue}`) com **Azul-névoa** (`{colors.blue-tint}`): status "reservado" na célula e etiqueta informativa.
- **Verde-ok** (`{colors.ok}`) com **Ok-névoa** (`{colors.ok-tint}`): status "entregue", sucesso.
- **Vermelho-perigo** (`{colors.danger}`) com **Perigo-névoa** (`{colors.danger-tint}`): erro e ação destrutiva.
- **Cores de marca** (`{colors.brand-antarctica}`, `{colors.brand-brahma}`, `{colors.brand-black}`, `{colors.brand-stella}`, `{colors.brand-colorado}`): somente faixa de 5 a 6px no topo da coluna do produto e ponto quadrado de 10px. Marca desconhecida cai para o verde-garrafa.

### Neutral
- **Porcelana** (`{colors.porcelain}`): fundo da página, cabeçalhos de tabela, rótulos de controle.
- **Azulejo branco** (`{colors.tile}`): superfície de painéis, células, campos.
- **Rejunte** (`{colors.grout}`) e **Rejunte forte** (`{colors.grout-strong}`): linhas internas e contornos externos. O rejunte forte também borda campos, botões e painéis.
- **Tinta** (`{colors.ink}`), **Tinta 2** (`{colors.ink-2}`), **Tinta 3** (`{colors.ink-3}`): texto principal, secundário e de apoio.

### Named Rules
**The Orange Is Attention Rule.** Laranja aparece apenas para seleção, foco e atenção (estoque baixo, aviso, linha selecionada). Nunca como cor de marca, decoração ou ação primária. Estados "selecionado" de controles segmentados usam verde-garrafa, não laranja; o item ativo da navegação usa preenchimento porcelana.

**The Brand Band Rule.** Cor de marca de produto só identifica o produto: faixa no topo da coluna e ponto quadrado. Nunca em botões, fundos ou texto.

## Typography

**Display Font:** Barlow Semi Condensed (com Barlow, system-ui)
**Body Font:** Barlow (com system-ui, Segoe UI, Roboto, Arial)

**Character:** Barlow é de placa de balcão, aberta e legível a 15px; a versão semi condensada deixa títulos e números compactos, de modo que um código de cliente ou uma quantidade cabe grande numa célula de 112px. Pesos carregados: 400, 500, 600, 700 do corpo; 600 e 700 do condensado.

### Hierarchy
- **Display** (700, 32px, 1.05, -0.01em): título da página; 34px no login; 38px e 30px para o número grande do resumo do fechamento e da sugestão.
- **Headline** (700, 19px): título de seção acima de painéis; 21px no cabeçalho do modal.
- **Numeral** (700, 20px, tabular): quantidade nas células da grade e botões numéricos; 18px para o código do cliente; 19px nos totais; 24px no total a puxar.
- **Body** (400, 15px, 1.45, tabular): texto corrente, células de tabela, campos, botões (600).
- **Label** (600, 13px): rótulo de campo, cabeçalho de tabela (700), legenda da grade (13.5px).
- **Tag** (700, 12px, 0.01em): etiquetas de estado, sem caixa alta.

### Named Rules
**The Tabular Rule.** Todo número é tabular (`tnum` no corpo inteiro). Colunas de quantidade nunca dançam.

**The Code First Rule.** Onde há cliente, o código vem primeiro, em numeral condensado sobre azulejo verde-névoa; o nome vem depois, em corpo 600, com cidade ou setor em 12.5px de tinta 3.

## Layout

Casca em duas partes: barra lateral fixa de 232px à esquerda (a partir de 768px) e área principal com padding de 28px por 36px. Telas de leitura usam coluna estreita (máx. 1120px); a grade de reservas ocupa toda a largura. O cabeçalho da página tem altura mínima de 92px, título e ação principal na mesma linha, e uma linha verde de 3px por baixo. Espaçamento em múltiplos de 4: 16px entre blocos de controles, 14px laterais em células de tabela, 18px por 20px dentro de painéis, 24px entre colunas de painéis.

A grade de reservas: colunas fixas à esquerda (código 96px, nome 232px) com sticky, cabeçalho pinado, linha de totais pinada embaixo, células de 112px por 44px. Altura máxima da grade `100vh - 292px`. Pensada apenas para desktop; abaixo de 768px a barra lateral é substituída por navegação móvel, sem tratamento próprio de grade.

## Elevation & Depth

Plano por padrão. A profundidade vem do rejunte (bordas de 1px em `{colors.grout}` e `{colors.grout-strong}`), de camadas tonais (porcelana sob azulejo branco) e de faixas de cor cheia (verde no topo das colunas, nos totais, no cabeçalho do modal). Painéis, botões, campos e células não têm sombra.

### Named Rules
**The Grout Not Shadow Rule.** Separação se faz com linha de 1px ou mudança de tom, nunca com sombra suave. O modal é o único elemento do build com sombra difusa; é uma exceção carregada pelo build, não uma regra para novas superfícies.

## Shapes

Raio de 2px em todo controle, painel, etiqueta e botão (1px no ponto de marca e na barra de estoque). Quadrado como azulejo; sem pílulas, sem círculos como forma de controle. Tabelas com rejunte vertical e horizontal (`.joint`). Célula cancelada usa hachura diagonal cinza. O padrão de azulejo hidráulico (quatro quartos de círculo em torno de um losango laranja, verde e verde profundo, 48px) aparece só no pé da barra lateral (72px de altura) e na metade esquerda do login (96px).

## Components

### Buttons
- **Shape:** quadrados de 2px, 40px de altura (32px no tamanho pequeno), borda de 1px, peso 600.
- **Primary:** verde-garrafa com texto branco; hover para verde profundo.
- **Default:** azulejo branco com borda de rejunte forte; hover com fundo verde-névoa e borda verde.
- **Quiet / Link / Icon:** transparente com tinta 2; link verde sublinhado, hover laranja-tinta (vermelho em ação destrutiva); ícone de 34px.
- **Focus:** anel laranja de 2px, deslocado 2px.

### Segmented control
Caixa com contorno de rejunte forte, rótulo em porcelana à esquerda, botões de 38px separados por rejunte. Selecionado: preenchimento verde-garrafa e texto branco. Hover não selecionado: verde-névoa.

### Inputs / Fields
- **Style:** 40px, azulejo branco, borda de rejunte forte, 2px de raio, placeholder em tinta 3.
- **Focus:** borda e anel laranja de 2px.
- **Grade:** campo numérico sem borda dentro da célula, centralizado, 20px condensado; foco com anel laranja de 3px por dentro e fundo laranja-névoa.

### Reservation grid cell
Azulejo de 112px por 44px com número e botão de status de 30px à direita. Reservado: fundo azul-névoa e ícone azul. Entregue: verde-ok-névoa e ícone verde-ok. Cancelado: hachura cinza e número riscado em tinta 3. Cabeçalho do produto: faixa superior de 6px na cor da marca; linha de totais em verde-garrafa pinada embaixo.

### Tables
Cabeçalho em porcelana, 13px 700, células de 11px por 14px com rejunte; hover `#f8faf7`; linha selecionada em laranja-névoa. Células numéricas (`ncel`) tingidas de verde-névoa e centralizadas; em alerta, laranja-névoa com número laranja-tinta.

### Tags and notices
Etiquetas de 22px: neutra, ok, perigo, aviso (laranja-névoa), azul. Avisos em bloco com fundo tingido e borda de rejunte tonal; vazio com borda tracejada.

### Navigation
Barra lateral verde-garrafa de 232px: bloco branco do logo no topo, seis itens de 44px (Painel, Reservas, Clientes, Estoque, Sugestão, Fechamento) com ícone e rótulo 15.5px 600 em verde muito claro, "Sair" ao fim, e o padrão de azulejo no pé. Hover: branco a 12%. Ativo: preenchimento porcelana com texto verde profundo.

### Logo slot
Bloco branco com nome "Dibral" em condensado 30px e subtítulo "Gestão de chopp". Carrega `/logo-dibral.svg` quando o arquivo existir; até lá, só texto. Nenhum símbolo ou cor de marca da Dibral foi estabelecido.

### Progress bar (estoque)
Barra de 12px, trilho porcelana com borda, preenchimento verde-garrafa; abaixo do mínimo, laranja; marca de 2px em tinta no estoque mínimo.

### Modal
Painel branco de 520px, cabeçalho verde-garrafa com título branco, fundo escurecido em tinta a 50%, entrada de 220ms com deslocamento de 8px.

### Named Rules
**The Selected Is Green Rule.** Seleção de controle (segmentado, item ativo) é verde ou porcelana; laranja fica para foco e linha selecionada em tabela.

## Do's and Don'ts

### Do:
- **Do** separar áreas com rejunte de 1px (`{colors.grout}` dentro, `{colors.grout-strong}` no contorno).
- **Do** usar raio de 2px em tudo que for controle ou superfície.
- **Do** mostrar código antes de nome e usar numerais condensados tabulares para quantidades.
- **Do** usar laranja só para foco, seleção e atenção, e dizer no aviso o que fazer.
- **Do** usar cor de marca de produto só na faixa de coluna e no ponto quadrado.
- **Do** manter o padrão de azulejo hidráulico restrito ao pé da barra lateral e ao login.
- **Do** manter o logo como espaço reservado em texto até o arquivo real ser fornecido.

### Don't:
- **Don't** usar cartões macios com sombra, nem o âmbar escuro de "chopeira" da versão anterior.
- **Don't** usar laranja como cor de botão primário, decoração ou marca.
- **Don't** arredondar além de 2px nem usar pílulas.
- **Don't** colocar o padrão de azulejo em fundos de conteúdo, cabeçalhos ou cartões.
- **Don't** pintar botões, texto ou fundos com cores de marca de chopp.
- **Don't** inventar logo, símbolo ou cor de marca da Dibral.
