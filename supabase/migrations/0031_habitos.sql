begin;
create table if not exists public.habitos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 titulo text not null check(length(trim(titulo)) between 1 and 120),
 descricao text not null default '' check(length(descricao)<=500),
 cor text not null default '#21805C' check(cor in ('#C51E72','#21805C','#7A5AF8','#C45B26','#247CB0','#AB8230')),
 inicio date not null,
 arquivado boolean not null default false,
 created_at timestamptz not null default now(),
 unique(id,user_id)
);
create table if not exists public.habitos_dias (
 habito_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 data date not null,
 created_at timestamptz not null default now(),
 primary key(habito_id,data),
 foreign key(habito_id,user_id) references public.habitos(id,user_id) on delete cascade
);
create index if not exists habitos_usuario on public.habitos(user_id,arquivado);
create index if not exists habitos_dias_usuario_data on public.habitos_dias(user_id,data);
alter table public.habitos enable row level security;
alter table public.habitos_dias enable row level security;
drop policy if exists habitos_dono on public.habitos;
create policy habitos_dono on public.habitos for all using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists habitos_dias_dono on public.habitos_dias;
create policy habitos_dias_dono on public.habitos_dias for all using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.habitos,public.habitos_dias to erp_inova_app;
commit;
