# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Uma única pessoa na Dibral (revendedora Ambev) que cuida da gestão do chopp (Brahma, Antarctica e demais marcas). Usa só no computador, sozinha, sem contas de usuário (apenas uma senha de acesso). O uso tem dois ritmos: segunda-feira é uma sessão longa, com calma, para lançar as reservas da semana recebidas pelo WhatsApp; no resto da semana são visitas curtas e rápidas (fechamento do dia, conferir estoque, ver a sugestão de compra). As telas mais usadas são a grade de reservas e o fechamento do dia.

## Product Purpose

A quantidade de chopp puxada da fábrica por semana não atende todos os clientes da revenda, então é preciso gerir quem recebe quanto. O sistema substitui uma planilha de Excel e cobre: reserva semanal por cliente e produto, estoque lançado manualmente, sugestão de quanto puxar na fábrica, e o fechamento diário a partir do relatório CSV do Promax (vendido x reservado, alertas, baixa nas reservas, mensagem de WhatsApp). Sucesso: lançar uma segunda-feira inteira de reservas sem atrito e fechar o dia em poucos cliques, sem erro de contagem.

## Positioning

Ferramenta interna feita sob medida para a rotina da Dibral: entende o relatório real do Promax (chopp vendido em litros, convertido em barris), os códigos de cliente usados no dia a dia e o fluxo de reservas por WhatsApp. Nenhuma planilha genérica ou sistema de ERP faz esse caminho reserva → venda → sugestão de compra.

## Operating Context

- Reservas chegam por WhatsApp, normalmente na segunda-feira; não há limite por cliente; a ordem de atendimento segue a ordem da reserva.
- O estoque real é controlado no Promax; no sistema é lançado manualmente (chopp e quantidade disponível), com alerta de estoque baixo (mínimo por produto).
- Sugestão de compra usa a média das últimas semanas.
- O fechamento do dia vem de um CSV exportado do Promax (separador `;`, Windows-1252), processado no navegador por causa do limite de 4,5 MB da Vercel.
- Códigos de cliente valem mais que nomes na consulta do dia a dia: busca por código e ordenação por código ou nome são essenciais.
- A semana é segunda a domingo (ISO).

## Capabilities and Constraints

- Produtos: Antarctica 30L, Antarctica 50L, Brahma 30L, Brahma 50L, Brahma Black 30L, Stella 30L, Colorado 30L. Códigos Promax: Brahma 30L 828, Brahma 50L 838, Antarctica 30L 2415, Antarctica 50L 2419, Brahma Black 30L 8776, Stella 30L 8037, Colorado 30L 15321.
- Telas e funções existentes (todas preservadas): Painel; Reservas (grade tipo planilha, uma linha por cliente ativo, colunas Nome/Setor/Cidade + um chopp por coluna, autosave ao sair da célula, status por célula reservado/entregue/cancelado, totais, busca, ordenação, navegação por semana); Clientes (nome opcional, código principal obrigatório e único, código secundário, WhatsApp, setor, cidade, ativo; cadastro individual e importação em massa por CSV com modelo); Estoque (lançamento manual, alerta de baixo); Sugestão de compra; Fechamento (importar CSV do Promax, resumo em barris, vendas sem reserva, retirou mais que o reservado, sincronizar com reservas — baixa a quantidade e marca entregue ao zerar, cria reserva "entregue" quando não havia —, mensagem de WhatsApp com cidades e códigos, histórico); Login por senha.
- Somente desktop; uma pessoa só; aplicação leve, com foco em desempenho, segurança e intuitividade.
- Linguagem do produto: português do Brasil, simples, sem jargão técnico.
- Stack existente: Next.js 16 + TypeScript + Tailwind + Supabase + Vercel (planos gratuitos).

## Brand Commitments

O logo da Dibral deve aparecer no sistema. O arquivo ainda não foi enviado; o usuário vai fornecê-lo depois. Nenhuma marca, cor ou logo pode ser inventado no lugar. Cores obrigatórias da Dibral/Ambev: nenhuma estabelecida.

## Evidence on Hand

- Relatório real do Promax em `/mnt/user-data/uploads/fechamento.csv`.
- Sistema atual em funcionamento (referência de funções e conteúdo, não de visual).
- Ausência: não há arquivo de logo da Dibral, nem manual de marca, nem capturas do Excel original. Não fabricar.

## Product Principles

1. A segunda-feira é uma maratona de digitação: a grade de reservas vem antes de qualquer outra coisa e não pode cansar nem errar.
2. O dia a dia é rápido: o essencial (alertas, o que fechar, quanto puxar) aparece sem procurar.
3. O código do cliente é a chave de leitura; o nome vem depois.
4. Números e alertas devem ser inequívocos: quem decide quantos barris puxar não pode ter dúvida do que está lendo.
5. Simplicidade e leveza acima de enfeite: cada tela faz uma coisa e usa linguagem comum do balcão.

## Accessibility & Inclusion

Nenhuma necessidade específica foi estabelecida. Uso prolongado em tela de computador na segunda-feira sugere legibilidade confortável, mas isso é uma observação, não um requisito confirmado.
