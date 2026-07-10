-- ===========================================================================
-- 0017 — Time Tracker: categoria da sessao (trabalho/estudo)
-- ===========================================================================

create type sessao_categoria as enum ('trabalho', 'estudo');

alter table sessoes_foco
  add column categoria sessao_categoria not null default 'trabalho';
