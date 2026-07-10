-- ===========================================================================
-- 0010 — Meta financeira mensal
-- Uma linha por mês (primeiro dia do mês) por usuário; usada no Dashboard
-- para mostrar o progresso de recebimento vs. a meta do mês.
-- ===========================================================================

create table metas_financeiras (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  mes        date not null,              -- primeiro dia do mês (ex: 2026-07-01)
  valor_meta numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, mes)
);
create index on metas_financeiras (user_id, mes);

alter table metas_financeiras enable row level security;
create policy "metas_owner" on metas_financeiras for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
