# Dibral · Gestão de Chopp

Aplicação web para a gestão semanal de reservas, estoque e sugestão de
compra de chopp da Dibral (revenda Ambev).

Feita sob medida para uso de uma única pessoa, sem necessidade de
cadastro de usuários — apenas uma senha de acesso.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL) — banco de dados, plano gratuito
- **Vercel** — hospedagem, plano gratuito
- Sem dependência de fontes externas nem bibliotecas pesadas — app leve por design

## Funcionalidades

- **Painel** — visão geral da semana: estoque, alertas e sugestão de compra
- **Reservas** — lançamento semanal por cliente/produto, com navegação entre semanas
- **Clientes** — cadastro, edição, ativação/desativação
- **Estoque** — indicadores visuais em formato de barril, edição rápida e alerta de estoque mínimo por produto
- **Fechamento** — importe o CSV de pedidos do dia exportado do Promax; o sistema reconhece as linhas de chopp (vendido por litro no Promax, convertido para barris), soma o total do dia, mostra o chopp mais vendido e aponta alertas: clientes que compraram sem ter reservado, ou que já pegaram mais do que reservaram na semana. Um botão "Concluir fechamento e sincronizar" desconta o que foi entregue das reservas da semana (marcando como entregue quando zerar) e cria uma reserva já entregue para quem comprou sem ter reservado. Fica um histórico de todos os fechamentos importados.
- **Sugestão de compra** — média móvel das últimas 4 semanas combinada com as reservas já feitas na semana atual

## Como colocar em produção

Veja o passo a passo completo em [`DEPLOY.md`](./DEPLOY.md).
Resumo: criar um projeto gratuito no Supabase, rodar `supabase/schema.sql`,
subir este código para um repositório no GitHub e importar na Vercel
configurando as 3 variáveis de `.env.local.example`.

## Rodando localmente (opcional)

```bash
npm install
cp .env.local.example .env.local   # preencha com suas chaves do Supabase
npm run dev
```

Acesse http://localhost:3000 — vai pedir a senha definida em `APP_PASSWORD`.

## Estrutura do banco de dados

Ver `supabase/schema.sql`. Quatro tabelas: `produtos` (os 7 chopps fixos),
`clientes`, `reservas` (por cliente/produto/semana) e `estoque` (quantidade
atual por produto). Row Level Security está habilitado sem nenhuma policy —
a aplicação só acessa o banco pelo servidor, usando a `service_role key`,
que ignora RLS. Isso significa que não existe nenhuma forma de ler ou
escrever no banco diretamente pelo navegador.
