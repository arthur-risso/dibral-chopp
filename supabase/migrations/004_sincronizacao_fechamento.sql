-- ============================================================
-- Migração: sincronização do Fechamento com as Reservas
--
-- Rode isso se você já executou as migrações anteriores no Supabase.
-- Se este é o seu primeiro deploy, ignore este arquivo — o schema.sql
-- já sai atualizado.
-- ============================================================

alter table fechamentos add column if not exists sincronizado_em timestamptz;

-- Reserva agora pode chegar a 0 (significa "tudo já foi retirado")
alter table reservas drop constraint if exists reservas_quantidade_check;
alter table reservas add constraint reservas_quantidade_check check (quantidade >= 0);
alter table reservas alter column quantidade set default 0;
