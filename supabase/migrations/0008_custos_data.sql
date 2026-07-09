-- ===========================================================================
-- 0008 — Despesas com data própria
-- "data" = quando o custo ocorreu (created_at segue como timestamp de auditoria).
-- ===========================================================================

alter table custos
  add column if not exists data date not null default current_date;
