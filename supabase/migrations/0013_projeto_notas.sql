-- ===========================================================================
-- 0013 — Anotações importantes do projeto
-- Caixa de notas dentro de cada projeto; prioridade sobe pro topo.
-- ===========================================================================

create table projeto_notas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  projeto_id uuid not null references projetos (id) on delete cascade,
  texto      text not null,
  prioridade boolean not null default false,
  created_at timestamptz not null default now()
);
create index on projeto_notas (projeto_id, prioridade desc, created_at desc);

alter table projeto_notas enable row level security;
create policy "projeto_notas_owner" on projeto_notas for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
