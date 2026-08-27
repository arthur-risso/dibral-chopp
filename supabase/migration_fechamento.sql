-- ============================================================
-- Migração: Fechamento diário (importação do relatório do Promax)
--
-- Rode isso se você já executou o schema.sql (ou as migrações
-- anteriores) no Supabase. Se este é o seu primeiro deploy,
-- ignore este arquivo — o schema.sql já sai atualizado.
-- ============================================================

alter table produtos add column if not exists codigo_promax text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'produtos_codigo_promax_key'
  ) then
    alter table produtos add constraint produtos_codigo_promax_key unique (codigo_promax);
  end if;
end $$;

update produtos set codigo_promax = '2415' where nome = 'Antarctica 30L';
update produtos set codigo_promax = '2419' where nome = 'Antarctica 50L';
update produtos set codigo_promax = '828'  where nome = 'Brahma 30L';
update produtos set codigo_promax = '838'  where nome = 'Brahma 50L';
update produtos set codigo_promax = '8776' where nome = 'Brahma Black 30L';
update produtos set codigo_promax = '8037' where nome = 'Stella Artois 30L';
update produtos set codigo_promax = '15321' where nome = 'Colorado 30L';

create table if not exists fechamentos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  arquivo_nome text,
  total_linhas integer not null default 0,
  linhas_reconhecidas integer not null default 0,
  criado_em timestamptz not null default now()
);

create table if not exists fechamento_vendas (
  id uuid primary key default gen_random_uuid(),
  fechamento_id uuid not null references fechamentos(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  quantidade_litros integer not null,
  quantidade_barris integer not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_fechamentos_data on fechamentos (data);
create index if not exists idx_fechamento_vendas_fechamento on fechamento_vendas (fechamento_id);
create index if not exists idx_fechamento_vendas_cliente_produto on fechamento_vendas (cliente_id, produto_id);

alter table fechamentos enable row level security;
alter table fechamento_vendas enable row level security;
