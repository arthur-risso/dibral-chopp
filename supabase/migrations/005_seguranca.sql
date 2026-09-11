-- ============================================================
-- Migração 005: reforço de segurança e integridade dos dados
--
-- Rode se o seu banco foi criado antes desta versão. Pode ser rodada
-- mais de uma vez sem problema. Em um banco novo, o schema.sql já
-- inclui tudo isto — ignore este arquivo.
-- ============================================================

-- 1) RLS ligado em todas as tabelas. Sem nenhuma policy, nada passa
--    pela chave anon/authenticated — só a service_role (servidor).
alter table produtos enable row level security;
alter table clientes enable row level security;
alter table reservas enable row level security;
alter table estoque enable row level security;
alter table fechamentos enable row level security;
alter table fechamento_vendas enable row level security;

-- 2) Segunda camada: as roles públicas da API perdem qualquer permissão
--    nas tabelas (caso alguém crie uma policy por engano no futuro) e
--    as tabelas deixam de aparecer na documentação automática da API
--    para quem só tem a chave anon.
revoke all on table produtos, clientes, reservas, estoque, fechamentos, fechamento_vendas
  from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- 3) Regras de integridade (as mesmas que a API já valida).
--    "not valid" aplica a regra a tudo que for gravado daqui em diante,
--    sem travar a migração por causa de algum dado antigo fora do padrão.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'produtos_volume_litros_check') then
    alter table produtos add constraint produtos_volume_litros_check
      check (volume_litros > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'produtos_estoque_minimo_check') then
    alter table produtos add constraint produtos_estoque_minimo_check
      check (estoque_minimo >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'estoque_quantidade_atual_check') then
    alter table estoque add constraint estoque_quantidade_atual_check
      check (quantidade_atual >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'clientes_tamanhos_check') then
    alter table clientes add constraint clientes_tamanhos_check check (
      char_length(codigo_principal) between 1 and 50
      and coalesce(char_length(nome), 0) <= 150
      and coalesce(char_length(codigo_secundario), 0) <= 50
      and coalesce(char_length(whatsapp), 0) <= 40
      and coalesce(char_length(setor), 0) <= 100
      and coalesce(char_length(cidade), 0) <= 100
    ) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'fechamentos_linhas_check') then
    alter table fechamentos add constraint fechamentos_linhas_check
      check (total_linhas >= 0 and linhas_reconhecidas >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'fechamentos_arquivo_nome_check') then
    alter table fechamentos add constraint fechamentos_arquivo_nome_check
      check (char_length(arquivo_nome) <= 255) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'fechamento_vendas_quantidades_check') then
    alter table fechamento_vendas add constraint fechamento_vendas_quantidades_check
      check (quantidade_litros >= 0 and quantidade_barris >= 0) not valid;
  end if;
end $$;
