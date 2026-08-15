-- ============================================================
-- Dibral · Gestão de Chopp — schema do banco de dados
-- Rode este script inteiro no SQL Editor do Supabase
-- (Project > SQL Editor > New query > colar e "Run")
-- ============================================================

create extension if not exists "pgcrypto";

-- Produtos (chopps trabalhados pela revenda) --------------------
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  marca text not null,
  volume_litros integer not null,
  estoque_minimo integer not null default 5,
  ordem integer not null default 0
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
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint clientes_codigo_principal_key unique (codigo_principal)
);

-- Reservas semanais ------------------------------------------------
create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  semana_referencia date not null,
  status text not null default 'reservado'
    check (status in ('reservado', 'entregue', 'cancelado')),
  criado_em timestamptz not null default now()
);

create index if not exists idx_reservas_semana on reservas (semana_referencia);
create index if not exists idx_reservas_produto on reservas (produto_id);
create index if not exists idx_reservas_cliente on reservas (cliente_id);

-- Estoque atual (1 linha por produto) -------------------------------
create table if not exists estoque (
  produto_id uuid primary key references produtos(id) on delete cascade,
  quantidade_atual integer not null default 0,
  atualizado_em timestamptz not null default now()
);

-- Segurança: habilita RLS e não cria nenhuma policy de acesso.
-- A aplicação nunca usa a chave anônima — só a service_role key,
-- que roda apenas no servidor (API routes) e ignora RLS.
-- Isso impede qualquer leitura/escrita vinda diretamente do navegador.
alter table produtos enable row level security;
alter table clientes enable row level security;
alter table reservas enable row level security;
alter table estoque enable row level security;

-- Produtos fixos da revenda -----------------------------------------
insert into produtos (nome, marca, volume_litros, ordem, estoque_minimo)
values
  ('Antarctica 30L', 'Antarctica', 30, 1, 5),
  ('Antarctica 50L', 'Antarctica', 50, 2, 5),
  ('Brahma 30L', 'Brahma', 30, 3, 5),
  ('Brahma 50L', 'Brahma', 50, 4, 5),
  ('Brahma Black 30L', 'Brahma', 30, 5, 3),
  ('Stella Artois 30L', 'Stella Artois', 30, 6, 3),
  ('Colorado 30L', 'Colorado', 30, 7, 3)
on conflict (nome) do nothing;

-- Linha de estoque inicial (zerada) para cada produto ----------------
insert into estoque (produto_id, quantidade_atual)
select id, 0 from produtos
on conflict (produto_id) do nothing;
