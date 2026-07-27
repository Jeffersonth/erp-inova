-- ===========================================================================
-- 0000 — Camada de compatibilidade para Postgres self-hosted (VPS)
-- ===========================================================================
-- As migrações 0001+ foram escritas para o Supabase e referenciam duas coisas
-- do Supabase Auth: a tabela `auth.users` (FK de todo `user_id`) e a função
-- `auth.uid()` (usada em toda policy de RLS "dono-por-linha").
--
-- Em vez de reescrever 21 migrações (arriscado, review maior), recriamos aqui
-- o mínimo necessário para que 0001+ rodem inalteradas contra um Postgres
-- comum:
--   - auth.users: só os campos realmente referenciados (id, email,
--     raw_user_meta_data via o trigger de 0002/0020).
--   - auth.uid(): no Supabase lê o claim "sub" do JWT verificado pelo
--     PostgREST. Aqui, a aplicação Node seta uma variável de sessão
--     (SET LOCAL app.user_id = '<uuid>') logo após validar o próprio JWT,
--     dentro da mesma transação de cada requisição autenticada — o RLS
--     continua valendo exatamente como antes, sem tocar em nenhuma policy.
--
-- gen_random_uuid() já é nativo do Postgres (13+), sem precisar de pgcrypto.

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique not null,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

comment on function auth.uid() is
  'Substitui o auth.uid() do Supabase. A aplicação (src/lib/db) roda '
  '`SET LOCAL app.user_id = $1` no início de cada transação autenticada.';
