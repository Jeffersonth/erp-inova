-- ===========================================================================
-- 0019 — Módulo Leads: canais de captação, registros de prospecção e metas
-- ===========================================================================

create table leads_canais (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nome       text not null,
  ordem      int  not null default 0,
  created_at timestamptz not null default now()
);
create index on leads_canais (user_id, ordem);

alter table leads_canais enable row level security;
create policy "leads_canais_owner" on leads_canais for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table leads_registros (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  canal_id      uuid not null references leads_canais (id) on delete cascade,
  data          date not null default current_date,
  contatos      int  not null default 0 check (contatos >= 0),
  respostas     int  not null default 0 check (respostas >= 0),
  propostas     int  not null default 0 check (propostas >= 0),
  vendas        int  not null default 0 check (vendas >= 0),
  valor_vendido numeric not null default 0 check (valor_vendido >= 0),
  observacoes   text,
  created_at    timestamptz not null default now()
);
create index on leads_registros (user_id, data desc);
create index on leads_registros (canal_id);

alter table leads_registros enable row level security;
create policy "leads_registros_owner" on leads_registros for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create type leads_meta_metrica as enum ('contatos', 'respostas', 'propostas', 'vendas', 'receita', 'manual');

create table leads_metas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  canal_id     uuid references leads_canais (id) on delete set null,
  titulo       text not null,
  metrica      leads_meta_metrica not null default 'contatos',
  alvo         numeric not null check (alvo > 0),
  atual_manual numeric not null default 0,
  mes          date not null default date_trunc('month', current_date)::date,
  created_at   timestamptz not null default now()
);
create index on leads_metas (user_id, mes);

alter table leads_metas enable row level security;
create policy "leads_metas_owner" on leads_metas for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Canais padrão para os usuários existentes
insert into leads_canais (user_id, nome, ordem)
select u.id, c.nome, c.ordem
from usuarios u
cross join (values
  ('E-mail (Captação Fria)', 0),
  ('Workana', 1),
  ('Google Perfil da Empresa', 2),
  ('Ligações', 3),
  ('WhatsApp', 4),
  ('Indicação', 5),
  ('Instagram', 6),
  ('LinkedIn', 7),
  ('Site', 8),
  ('Outros', 9)
) as c(nome, ordem);

-- Canais padrão para usuários novos (dispara quando o perfil é criado)
create function public.seed_leads_canais()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into leads_canais (user_id, nome, ordem) values
    (new.id, 'E-mail (Captação Fria)', 0),
    (new.id, 'Workana', 1),
    (new.id, 'Google Perfil da Empresa', 2),
    (new.id, 'Ligações', 3),
    (new.id, 'WhatsApp', 4),
    (new.id, 'Indicação', 5),
    (new.id, 'Instagram', 6),
    (new.id, 'LinkedIn', 7),
    (new.id, 'Site', 8),
    (new.id, 'Outros', 9);
  return new;
end;
$$;

create trigger usuarios_seed_leads_canais
  after insert on public.usuarios
  for each row execute procedure public.seed_leads_canais();
