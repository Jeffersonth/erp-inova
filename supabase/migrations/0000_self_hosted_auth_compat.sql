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
--
-- anon / authenticated: papéis que o Supabase cria para o PostgREST (uma
-- conexão por "papel" de requisição). Nunca conectamos como eles — só
-- precisam existir para os `revoke ... from public, anon, authenticated`
-- de 0003/0021 (endurecimento de funções SECURITY DEFINER) funcionarem
-- sem alteração.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end
$$;

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

-- ---------------------------------------------------------------------------
-- Papel de runtime da aplicação — NÃO é o POSTGRES_USER do container.
--
-- A imagem oficial do Postgres sempre cria o POSTGRES_USER como
-- SUPERUSER (é assim que ela faz o bootstrap do banco). Superusuário
-- IGNORA row level security por definição, não importa quantas policies
-- existam — então a aplicação nunca pode conectar como ele, ou toda a
-- segurança "dono-por-linha" desse sistema vira decoração. erp_inova_app
-- é o papel restrito que a aplicação de fato usa (DATABASE_URL no
-- docker-compose.yml); erp_inova (superuser) fica só para migrações/DDL.
--
-- A senha vem da variável de ambiente APP_DB_PASSWORD (.env), passada ao
-- psql como variável de cliente (-v app_pw=...) — nunca fica hardcoded
-- num arquivo versionado.
-- \gexec (não um DO com dollar-quote): a substituição de :'app_pw' pelo psql
-- é só garantida em SQL de nível superior, não dentro de string/dollar-quote.
select format('create role erp_inova_app login password %L', :'app_pw')
where not exists (select 1 from pg_roles where rolname = 'erp_inova_app')
\gexec

select format('alter role erp_inova_app password %L', :'app_pw')
where exists (select 1 from pg_roles where rolname = 'erp_inova_app')
\gexec

grant usage on schema public to erp_inova_app;
grant usage on schema auth to erp_inova_app;
grant execute on function auth.uid() to erp_inova_app;

-- Só select: o login (src/app/api/auth/login) confere e-mail/senha lendo
-- esta linha direto (sem RLS aqui, auth.users nunca teve policy). Criar/
-- alterar usuário continua sendo tarefa de script administrativo, não da
-- aplicação em runtime.
grant select on auth.users to erp_inova_app;

-- Tabelas que 0001+ ainda vão criar nesta mesma migração (rodando como o
-- POSTGRES_USER) herdam automaticamente estes privilégios.
alter default privileges for role erp_inova in schema public
  grant select, insert, update, delete on tables to erp_inova_app;
alter default privileges for role erp_inova in schema public
  grant usage, select on sequences to erp_inova_app;
