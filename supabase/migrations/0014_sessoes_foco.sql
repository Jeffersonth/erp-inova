-- ===========================================================================
-- 0014 — Time Tracker (pomodoro) + histórico de sessões
-- ===========================================================================

create type sessao_tipo as enum ('foco', 'pausa_curta', 'pausa_longa');

create table sessoes_foco (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  projeto_id    uuid references projetos (id) on delete set null,
  tipo          sessao_tipo not null default 'foco',
  duracao_seg   int not null,
  rotulo        text,
  iniciada_em   timestamptz not null default now(),
  finalizada_em timestamptz not null default now()
);
create index on sessoes_foco (user_id, finalizada_em desc);

alter table sessoes_foco enable row level security;
create policy "sessoes_foco_owner" on sessoes_foco for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
