begin;
create table if not exists public.regras_categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 100),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  unique(id,user_id)
);
create unique index if not exists regras_categorias_nome on public.regras_categorias(user_id,lower(nome));
create table if not exists public.regras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid not null,
  texto text not null check (length(trim(texto)) between 1 and 2000),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key(categoria_id,user_id) references public.regras_categorias(id,user_id) on delete restrict
);
create index if not exists regras_categoria_ordem on public.regras(user_id,categoria_id,ordem);
alter table public.regras_categorias enable row level security;
alter table public.regras enable row level security;
drop policy if exists regras_categorias_dono on public.regras_categorias;
create policy regras_categorias_dono on public.regras_categorias for all using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists regras_dono on public.regras;
create policy regras_dono on public.regras for all using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.regras_categorias,public.regras to erp_inova_app;
commit;
