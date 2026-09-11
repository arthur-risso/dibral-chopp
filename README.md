# Dibral · Gestão de Chopp

Aplicação web para a gestão semanal de reservas, estoque e sugestão de
compra de chopp da Dibral (revenda Ambev).

Feita sob medida para uso de uma única pessoa, sem necessidade de
cadastro de usuários — apenas uma senha de acesso.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL) — banco de dados, plano gratuito
- **Vercel** — hospedagem, plano gratuito
- **zod** — validação dos dados que chegam na API (roda só no servidor)
- Sem dependência de fontes externas nem bibliotecas pesadas no navegador — app leve por design

## Funcionalidades

- **Painel** — visão geral da semana: estoque, alertas e sugestão de compra
- **Reservas** — lançamento semanal por cliente/produto, com navegação entre semanas
- **Clientes** — cadastro, edição, ativação/desativação. Também dá para importar clientes em massa via planilha (baixe o modelo, preencha, salve como CSV e importe).
- **Estoque** — indicadores visuais em formato de barril, edição rápida e alerta de estoque mínimo por produto
- **Fechamento** — importe o CSV de pedidos do dia exportado do Promax; o sistema reconhece as linhas de chopp (vendido por litro no Promax, convertido para barris), soma o total do dia, mostra o chopp mais vendido e aponta alertas: clientes que compraram sem ter reservado, ou que já pegaram mais do que reservaram na semana. Gera automaticamente a mensagem de pedidos de chopp por cidade para o WhatsApp, com botão de copiar. Um botão "Concluir fechamento e sincronizar" desconta o que foi entregue das reservas da semana (marcando como entregue quando zerar) e cria uma reserva já entregue para quem comprou sem ter reservado. Fica um histórico de todos os fechamentos importados.
- **Sugestão de compra** — média móvel das últimas 4 semanas combinada com as reservas já feitas na semana atual

## Como colocar em produção

Veja o passo a passo completo em [`DEPLOY.md`](./DEPLOY.md).
Resumo: criar um projeto gratuito no Supabase, rodar `supabase/schema.sql`,
subir este código para um repositório no GitHub e importar na Vercel
configurando as variáveis de [`.env.example`](./.env.example).

## Rodando localmente (opcional)

```bash
npm install
cp .env.example .env.local   # preencha com suas chaves do Supabase
npm run dev
```

Acesse http://localhost:3000 — vai pedir a senha definida em `APP_PASSWORD`.

Verificações antes de publicar: `npm run lint`, `npm run typecheck` e `npm run build`.

## Estrutura do projeto

```
src/
  proxy.ts            barra quem não está logado e recusa requisições de outros sites (CSRF)
  app/
    (app)/            páginas do sistema (painel, reservas, clientes, estoque…)
    login/            tela de login
    api/              rotas da API — todas criadas com route() (lib/server/http.ts)
  components/         componentes visuais
  lib/
    server/           código que só roda no servidor (import "server-only")
      session.ts        cookie de sessão assinado, com validade
      http.ts           route(): checa a sessão e trata erros; parseBody()
      schemas.ts        validação (zod) de tudo que chega na API
      db.ts             cliente Supabase, paginação e tradução de erros do banco
      rateLimit.ts      limite de tentativas de login
      produtos.ts, fechamentoResumo.ts   consultas reaproveitadas pelas rotas
    apiClient.ts      chamadas do navegador à API (trata erro e sessão expirada)
    navigation.ts     itens do menu e logout
    types.ts, week.ts, clientes.ts, *Parser.ts…   código compartilhado
supabase/
  schema.sql          banco completo, para um projeto novo
  migrations/         atualizações de um banco que já existe, em ordem
```

## Segurança

- **Login**: a senha é comparada em tempo constante; 5 erros seguidos bloqueiam o IP por 15 minutos.
- **Sessão**: cookie `HttpOnly`, `SameSite=Lax` e `Secure`, assinado com HMAC (`SESSION_SECRET`).
  Expira depois de 7 dias sem uso e é renovado automaticamente para quem está usando.
  Trocar `APP_PASSWORD` ou `SESSION_SECRET` desconecta todos os aparelhos.
- **Autorização em duas camadas**: o `proxy.ts` e cada rota da API conferem a sessão.
- **CSRF**: requisições que alteram dados só são aceitas se vierem do próprio app.
- **Validação**: toda entrada da API passa por um schema zod, com tipos, limites de tamanho
  e descarte de campos desconhecidos. As mesmas regras existem como constraints no banco.
- **Erros**: detalhes internos do banco ficam só no log do servidor; o navegador recebe mensagens genéricas.
- **Cabeçalhos**: CSP, `X-Frame-Options`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  `noindex`; respostas da API nunca ficam em cache.
- **Banco**: a `service_role key` só existe no servidor (o build falha se algum código do navegador
  importar `lib/server/`). Row Level Security está habilitado sem nenhuma policy e as roles públicas
  (`anon`/`authenticated`) não têm permissão em nenhuma tabela — não existe forma de ler ou escrever
  no banco diretamente pelo navegador.

## Estrutura do banco de dados

Ver `supabase/schema.sql`. Tabelas: `produtos` (os 7 chopps fixos),
`clientes`, `reservas` (por cliente/produto/semana), `estoque` (quantidade
atual por produto), `fechamentos` e `fechamento_vendas` (importações do Promax).
