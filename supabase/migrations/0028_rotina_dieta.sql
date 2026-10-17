begin;
create table if not exists public.rotina_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check(tipo in ('rotina','refeicao')),
  titulo text not null check(length(trim(titulo)) between 1 and 150),
  horario text not null check(horario ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  dias integer[] not null default array[0,1,2,3,4,5,6]
    check(cardinality(dias) between 1 and 7 and dias <@ array[0,1,2,3,4,5,6] and array_position(dias,null) is null),
  descricao text not null default '' check(length(descricao)<=10000),
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.rotina_itens enable row level security;
drop policy if exists rotina_itens_dono on public.rotina_itens;
create policy rotina_itens_dono on public.rotina_itens for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create index if not exists rotina_itens_user on public.rotina_itens(user_id,tipo,horario);
grant select,insert,update,delete on public.rotina_itens to erp_inova_app;
commit;
