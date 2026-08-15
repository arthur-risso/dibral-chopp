-- ============================================================
-- Migração: novo formato de cliente (nome opcional, código
-- principal/secundário) — rode isso SOMENTE se você já executou
-- o schema.sql anterior no Supabase e já tem a tabela `clientes`
-- no formato antigo (nome obrigatório, endereço, observações).
--
-- Se você ainda não rodou nenhum script no Supabase, ignore este
-- arquivo e rode apenas o schema.sql, que já vem atualizado.
-- ============================================================

alter table clientes add column if not exists codigo_principal text;
alter table clientes add column if not exists codigo_secundario text;

-- Preenche um código temporário para clientes já cadastrados sem
-- código, para permitir tornar a coluna obrigatória com segurança.
-- Depois de rodar, revise e ajuste esses códigos manualmente pela tela.
update clientes
set codigo_principal = 'TEMP-' || substr(id::text, 1, 8)
where codigo_principal is null or codigo_principal = '';

alter table clientes alter column codigo_principal set not null;
alter table clientes alter column nome drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clientes_codigo_principal_key'
  ) then
    alter table clientes add constraint clientes_codigo_principal_key unique (codigo_principal);
  end if;
end $$;

alter table clientes drop column if exists endereco;
alter table clientes drop column if exists observacoes;
