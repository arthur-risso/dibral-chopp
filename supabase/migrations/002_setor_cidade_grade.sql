-- ============================================================
-- Migração: Setor/Cidade no cliente + grade de reservas
-- (uma única reserva por cliente+produto+semana, editável como
-- célula de planilha)
--
-- Rode isso se você já executou o schema.sql (ou as migrações
-- anteriores) no Supabase. Se este é o seu primeiro deploy,
-- ignore este arquivo — o schema.sql já sai atualizado.
-- ============================================================

-- 1) Novos campos opcionais no cliente
alter table clientes add column if not exists setor text;
alter table clientes add column if not exists cidade text;

-- 2) A grade exige no máximo 1 reserva por cliente+produto+semana.
--    Se você já lançou reservas duplicadas para a mesma combinação
--    (era permitido na versão em lista), isso mantém apenas a mais
--    recente de cada grupo e remove as demais antes de travar a regra.
delete from reservas a using reservas b
where a.cliente_id = b.cliente_id
  and a.produto_id = b.produto_id
  and a.semana_referencia = b.semana_referencia
  and a.criado_em < b.criado_em;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reservas_cliente_produto_semana_key'
  ) then
    alter table reservas
      add constraint reservas_cliente_produto_semana_key
      unique (cliente_id, produto_id, semana_referencia);
  end if;
end $$;
