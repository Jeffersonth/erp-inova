-- ===========================================================================
-- 0018 — Central de Trabalho: meta diária de horas de foco por usuário
-- ===========================================================================

alter table usuarios
  add column meta_horas_dia numeric not null default 6;
