-- ============================================================
-- Dibral · Gestão de Chopp — schema do banco de dados
-- Rode este script inteiro no SQL Editor do Supabase
-- (Project > SQL Editor > New query > colar e "Run")
--
-- Este arquivo é o estado completo e atual do banco, para um projeto
-- NOVO. Se o seu banco já existe, não rode este arquivo: rode apenas
-- as migrações de supabase/migrations/ que ainda faltam.
-- ============================================================

create extension if not exists "pgcrypto";

-- Produtos (chopps trabalhados pela revenda) --------------------
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  marca text not null,
  volume_litros integer not null,
  estoque_minimo integer not null default 5,
  ordem integer not null default 0,
  -- código do produto no Promax, usado para reconhecer as vendas
  -- importadas do relatório de fechamento (chopp é vendido lá por litro)
  codigo_promax text unique,
  constraint produtos_volume_litros_check check (volume_litros > 0),
  constraint produtos_estoque_minimo_check check (estoque_minimo >= 0)
);

-- Clientes --------------------------------------------------------
-- nome: opcional. codigo_principal: obrigatório e único (ex.: código do
-- cliente no Promax). codigo_secundario: opcional, para um segundo código.
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text,
  codigo_principal text not null,
  codigo_secundario text,
  whatsapp text,
  setor text,
  cidade text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint clientes_codigo_principal_key unique (codigo_principal),
  -- mesmos limites validados pela API (src/lib/server/schemas.ts)
  constraint clientes_tamanhos_check check (
    char_length(codigo_principal) between 1 and 50
    and coalesce(char_length(nome), 0) <= 150
    and coalesce(char_length(codigo_secundario), 0) <= 50
    and coalesce(char_length(whatsapp), 0) <= 40
    and coalesce(char_length(setor), 0) <= 100
    and coalesce(char_length(cidade), 0) <= 100
  )
);

-- Reservas semanais ------------------------------------------------
create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,
  -- 0 = tudo que foi reservado já foi retirado (a sincronização do
  -- fechamento decrementa esse valor conforme as entregas acontecem)
  quantidade integer not null default 0 check (quantidade >= 0),
  semana_referencia date not null,
  status text not null default 'reservado'
    check (status in ('reservado', 'entregue', 'cancelado')),
  criado_em timestamptz not null default now(),
  -- Uma "célula" só existe uma vez por cliente/produto/semana (grade estilo planilha)
  constraint reservas_cliente_produto_semana_key unique (cliente_id, produto_id, semana_referencia)
);

create index if not exists idx_reservas_semana on reservas (semana_referencia);
create index if not exists idx_reservas_produto on reservas (produto_id);
create index if not exists idx_reservas_cliente on reservas (cliente_id);

-- Estoque atual (1 linha por produto) -------------------------------
create table if not exists estoque (
  produto_id uuid primary key references produtos(id) on delete cascade,
  quantidade_atual integer not null default 0,
  atualizado_em timestamptz not null default now(),
  constraint estoque_quantidade_atual_check check (quantidade_atual >= 0)
);

-- Fechamento diário (importação do relatório de pedidos do Promax) ---
-- Cada arquivo importado vira um "fechamento"; cada linha reconhecida
-- (cliente + produto batendo com o cadastro) vira uma venda associada.
create table if not exists fechamentos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  arquivo_nome text,
  total_linhas integer not null default 0,
  linhas_reconhecidas integer not null default 0,
  -- preenchido quando "Concluir fechamento e sincronizar" é usado,
  -- para não aplicar o desconto nas reservas mais de uma vez
  sincronizado_em timestamptz,
  criado_em timestamptz not null default now(),
  constraint fechamentos_linhas_check check (total_linhas >= 0 and linhas_reconhecidas >= 0),
  constraint fechamentos_arquivo_nome_check check (char_length(arquivo_nome) <= 255)
);

create table if not exists fechamento_vendas (
  id uuid primary key default gen_random_uuid(),
  fechamento_id uuid not null references fechamentos(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  quantidade_litros integer not null,
  quantidade_barris integer not null,
  criado_em timestamptz not null default now(),
  constraint fechamento_vendas_quantidades_check check (quantidade_litros >= 0 and quantidade_barris >= 0)
);

create index if not exists idx_fechamentos_data on fechamentos (data);
create index if not exists idx_fechamento_vendas_fechamento on fechamento_vendas (fechamento_id);
create index if not exists idx_fechamento_vendas_cliente_produto on fechamento_vendas (cliente_id, produto_id);

-- Segurança -----------------------------------------------------------
-- 1) RLS habilitado sem nenhuma policy: nenhuma leitura/escrita pela
--    chave anon passa. A aplicação usa só a service_role key, que roda
--    apenas no servidor (API routes) e ignora RLS.
alter table produtos enable row level security;
alter table clientes enable row level security;
alter table reservas enable row level security;
alter table estoque enable row level security;
alter table fechamentos enable row level security;
alter table fechamento_vendas enable row level security;

-- 2) Segunda camada: as roles públicas da API não têm permissão nenhuma
--    nas tabelas (nem nas que forem criadas depois).
revoke all on table produtos, clientes, reservas, estoque, fechamentos, fechamento_vendas
  from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Produtos fixos da revenda -----------------------------------------
insert into produtos (nome, marca, volume_litros, ordem, estoque_minimo, codigo_promax)
values
  ('Antarctica 30L', 'Antarctica', 30, 1, 5, '2415'),
  ('Antarctica 50L', 'Antarctica', 50, 2, 5, '2419'),
  ('Brahma 30L', 'Brahma', 30, 3, 5, '828'),
  ('Brahma 50L', 'Brahma', 50, 4, 5, '838'),
  ('Brahma Black 30L', 'Brahma', 30, 5, 3, '8776'),
  ('Stella Artois 30L', 'Stella Artois', 30, 6, 3, '8037'),
  ('Colorado 30L', 'Colorado', 30, 7, 3, '15321')
on conflict (nome) do nothing;

-- Linha de estoque inicial (zerada) para cada produto ----------------
insert into estoque (produto_id, quantidade_atual)
select id, 0 from produtos
on conflict (produto_id) do nothing;
