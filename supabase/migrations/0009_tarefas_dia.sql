-- ===========================================================================
-- 0009 — Tarefas do dia
-- Lista pessoal ordenável (drag para reordenar), separada do quadro de
-- projetos. Concluídas vão para o fim, em seção própria na UI.
-- ===========================================================================

create type tarefa_dia_status as enum ('pendente', 'em_andamento', 'concluida');

create table tarefas_dia (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  titulo         text not null,
  status         tarefa_dia_status not null default 'pendente',
  data_finalizar date,
  ordem          int not null default 0,
  concluida_em   timestamptz,
  created_at     timestamptz not null default now()
);
create index on tarefas_dia (user_id, status, ordem);

alter table tarefas_dia enable row level security;
create policy "tarefas_dia_owner" on tarefas_dia for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
