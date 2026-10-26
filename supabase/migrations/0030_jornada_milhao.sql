begin;
create table if not exists public.jornada_ganhos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 titulo text not null check(length(trim(titulo)) between 1 and 160),
 valor_centavos bigint not null check(valor_centavos>0 and valor_centavos<=999999999999),
 data date not null,
 origem text not null default '' check(length(origem)<=80),
 notas text not null default '' check(length(notas)<=2000),
 created_at timestamptz not null default now()
);
create table if not exists public.jornada_objetivos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 titulo text not null check(length(trim(titulo)) between 1 and 120),
 alvo_centavos bigint not null check(alvo_centavos>0 and alvo_centavos<=999999999999),
 tipo text not null check(tipo in ('marco','mensal')),
 mes date,
 prazo date,
 concluido_em date,
 created_at timestamptz not null default now(),
 check((tipo='marco' and mes is null) or (tipo='mensal' and mes is not null and extract(day from mes)=1))
);
create index if not exists jornada_ganhos_dia on public.jornada_ganhos(user_id,data);
create unique index if not exists jornada_meta_mes on public.jornada_objetivos(user_id,mes) where tipo='mensal';
create unique index if not exists jornada_marco on public.jornada_objetivos(user_id,alvo_centavos) where tipo='marco';
alter table public.jornada_ganhos enable row level security;
alter table public.jornada_objetivos enable row level security;
drop policy if exists jornada_ganhos_dono on public.jornada_ganhos;
create policy jornada_ganhos_dono on public.jornada_ganhos for all using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists jornada_objetivos_dono on public.jornada_objetivos;
create policy jornada_objetivos_dono on public.jornada_objetivos for all using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.jornada_ganhos,public.jornada_objetivos to erp_inova_app;
insert into public.jornada_objetivos(user_id,titulo,alvo_centavos,tipo)
select u.id,v.titulo,v.valor,'marco' from auth.users u cross join (values
 ('Primeiros R$ 20 mil',2000000::bigint),('Primeiros R$ 50 mil',5000000::bigint),
 ('Primeiros R$ 100 mil',10000000::bigint),('Primeiros R$ 250 mil',25000000::bigint),
 ('Primeiros R$ 500 mil',50000000::bigint),('Meu primeiro milhão',100000000::bigint)
) as v(titulo,valor) on conflict do nothing;
commit;
