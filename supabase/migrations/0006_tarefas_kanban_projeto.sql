-- ===========================================================================
-- 0006 — Quadro de tarefas por projeto
-- Cards (tarefas) organizados por etapa; etapas viram as colunas do quadro.
-- "final = true" marca a coluna de conclusão (soltar um card nela conclui).
-- ===========================================================================

create type tarefa_tipo as enum ('dev', 'design', 'conteudo', 'reuniao', 'bug');

alter table etapas add column if not exists final boolean not null default false;

create table tarefas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  projeto_id uuid not null references projetos (id) on delete cascade,
  etapa_id   uuid not null references etapas (id) on delete cascade,
  titulo     text not null,
  tipo       tarefa_tipo not null default 'dev',
  concluida  boolean not null default false,
  ordem      int not null default 0,
  created_at timestamptz not null default now()
);
create index on tarefas (projeto_id, etapa_id, ordem);
create index on tarefas (user_id);

alter table tarefas enable row level security;
create policy "tarefas_owner" on tarefas for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Backfill: projetos que já existiam (criados antes do quadro) recebem o
-- conjunto padrão de etapas, para ficarem utilizáveis de imediato.
insert into etapas (projeto_id, nome, ordem, final)
select p.id, e.nome, e.ordem, e.final
from projetos p
cross join (values ('A fazer', 0, false), ('Em andamento', 1, false), ('Revisão', 2, false), ('Concluído', 3, true)) as e(nome, ordem, final)
where not exists (select 1 from etapas x where x.projeto_id = p.id);
