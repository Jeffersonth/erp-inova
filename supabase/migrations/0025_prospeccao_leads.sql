begin;
create table if not exists public.prospeccao_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canal_id uuid not null references public.leads_canais(id),
  nome text not null check (length(trim(nome)) between 1 and 200),
  contato text,
  email text,
  telefone text,
  status text not null default 'respondeu'
    check (status in ('respondeu','em_contato','proposta','negociacao','convertido','perdido')),
  notas text not null default '',
  ultimo_contato date not null default current_date,
  proximo_contato date,
  valor_potencial numeric(12,2) check (valor_potencial >= 0),
  cliente_id uuid references public.clientes(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.prospeccao_leads enable row level security;
drop policy if exists prospeccao_leads_dono on public.prospeccao_leads;
create policy prospeccao_leads_dono on public.prospeccao_leads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists prospeccao_leads_user_status on public.prospeccao_leads(user_id, status);
create unique index if not exists prospeccao_leads_cliente on public.prospeccao_leads(cliente_id) where cliente_id is not null;
grant select, insert, update, delete on public.prospeccao_leads to erp_inova_app;
commit;
