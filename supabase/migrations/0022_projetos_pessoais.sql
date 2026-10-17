begin;
create table if not exists public.projetos_pessoais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 1 and 200),
  categoria text not null default 'Outro' check (categoria in ('Aplicativo', 'Site', 'Outro')),
  prazo date,
  anotacoes text not null default '',
  etapas jsonb not null default '[]'::jsonb check (jsonb_typeof(etapas) = 'array'),
  created_at timestamptz not null default now()
);
alter table public.projetos_pessoais enable row level security;
drop policy if exists projetos_pessoais_dono on public.projetos_pessoais;
create policy projetos_pessoais_dono on public.projetos_pessoais
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists projetos_pessoais_user_idx on public.projetos_pessoais(user_id);
grant select, insert, update, delete on public.projetos_pessoais to erp_inova_app;
commit;
