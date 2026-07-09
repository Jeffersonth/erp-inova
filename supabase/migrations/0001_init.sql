-- ERP Pessoal (Inova Labs) — Fase 1 schema
-- Todo o dado do sistema vive no Postgres do Supabase. Auth via Supabase Auth.
-- RLS: dono-por-linha (user_id = auth.uid()). `historico` é append-only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role         as enum ('admin', 'gestor', 'colaborador');
create type cliente_status    as enum ('lead', 'qualificado', 'proposta', 'negociacao', 'cliente', 'recorrente', 'frio', 'perdido');
create type projeto_status    as enum ('briefing', 'proposta', 'aprovado', 'dev', 'revisao', 'entrega', 'concluido');
create type etapa_status      as enum ('prevista', 'em_andamento', 'concluida', 'atrasada');
create type recebimento_status as enum ('em_dia', 'agendado', 'atrasado', 'pago', 'recorrente');
create type assinatura_status as enum ('ativa', 'retry', 'inadimplente', 'cancelada');
create type moeda             as enum ('BRL', 'USD', 'EUR');
create type risco_nivel       as enum ('baixo', 'medio', 'alto');

-- ---------------------------------------------------------------------------
-- usuarios (perfil do admin e colaboradores)
-- ---------------------------------------------------------------------------
create table usuarios (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null,
  email      text not null,
  telefone   text,
  funcao     text,
  role       user_role not null default 'admin',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clientes (CRM)
-- ---------------------------------------------------------------------------
create table clientes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  nome             text not null,
  contato_nome     text,
  email            text,
  telefone         text,
  pais             char(2) not null default 'BR',
  moeda            moeda not null default 'BRL',
  ramo             text,
  status           cliente_status not null default 'lead',
  score_ia         int check (score_ia between 0 and 100),
  valor_potencial  numeric(12,2),
  origem           text,
  etiquetas        text[] not null default '{}',
  cnpj_vat         text,
  endereco         text,
  proxima_acao_ia  text,
  ultima_interacao timestamptz,
  created_at       timestamptz not null default now()
);
create index on clientes (user_id);
create index on clientes (status);

-- ---------------------------------------------------------------------------
-- historico (eventos imutáveis do cliente — append-only)
-- ---------------------------------------------------------------------------
create table historico (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  tipo       text not null,               -- 'nota', 'proposta_enviada', 'pagamento_recebido', ...
  descricao  text not null,
  origem_ia  boolean not null default false,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on historico (cliente_id, created_at desc);

-- ---------------------------------------------------------------------------
-- projetos
-- ---------------------------------------------------------------------------
create table projetos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  cliente_id   uuid references clientes (id) on delete set null,
  titulo       text not null,
  valor        numeric(12,2),
  moeda        moeda not null default 'BRL',
  status       projeto_status not null default 'briefing',
  progresso    int not null default 0 check (progresso between 0 and 100),
  data_entrega date,
  risco_atraso int check (risco_atraso between 0 and 100),
  created_at   timestamptz not null default now()
);
create index on projetos (user_id);
create index on projetos (status);

-- ---------------------------------------------------------------------------
-- etapas (Kanban interno do projeto, com prazo individual)
-- ---------------------------------------------------------------------------
create table etapas (
  id           uuid primary key default gen_random_uuid(),
  projeto_id   uuid not null references projetos (id) on delete cascade,
  nome         text not null,
  ordem        int not null default 0,
  prazo        date,
  status       etapa_status not null default 'prevista',
  concluida_em date,
  duracao_dias int,
  media_dias   int
);
create index on etapas (projeto_id, ordem);

-- ---------------------------------------------------------------------------
-- checklist_itens
-- ---------------------------------------------------------------------------
create table checklist_itens (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references projetos (id) on delete cascade,
  texto         text not null,
  concluido     boolean not null default false,
  marcado_por_ia boolean not null default false,
  fonte         text,                      -- ex: 'IA · e-mail 28/06'
  ordem         int not null default 0
);
create index on checklist_itens (projeto_id, ordem);

-- ---------------------------------------------------------------------------
-- arquivos (metadados; binário no Supabase Storage)
-- ---------------------------------------------------------------------------
create table arquivos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  projeto_id     uuid references projetos (id) on delete cascade,
  cliente_id     uuid references clientes (id) on delete set null,
  nome           text not null,
  storage_path   text not null,
  classificacao_ia text,                   -- 'Contrato', 'Nota fiscal', 'Documento', 'Imagens'
  created_at     timestamptz not null default now()
);
create index on arquivos (projeto_id);

-- ---------------------------------------------------------------------------
-- recebimentos (contas a receber)
-- ---------------------------------------------------------------------------
create table recebimentos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  cliente_id uuid references clientes (id) on delete set null,
  projeto_id uuid references projetos (id) on delete set null,
  descricao  text,
  valor      numeric(12,2) not null,
  moeda      moeda not null default 'BRL',
  vencimento date,
  status     recebimento_status not null default 'em_dia',
  risco_ia   int check (risco_ia between 0 and 100),
  created_at timestamptz not null default now()
);
create index on recebimentos (user_id, vencimento);

-- ---------------------------------------------------------------------------
-- assinaturas (recorrências espelhadas do Asaas)
-- ---------------------------------------------------------------------------
create table assinaturas (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  cliente_id           uuid references clientes (id) on delete set null,
  plano                text,
  valor                numeric(12,2) not null,
  moeda                moeda not null default 'BRL',
  ciclo                text not null default 'mensal',
  status               assinatura_status not null default 'ativa',
  proxima_cobranca     date,
  asaas_subscription_id text,
  churn_score          int check (churn_score between 0 and 100),
  created_at           timestamptz not null default now()
);
create index on assinaturas (user_id);

-- ---------------------------------------------------------------------------
-- custos (para lucro por cliente)
-- ---------------------------------------------------------------------------
create table custos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  cliente_id uuid references clientes (id) on delete set null,
  descricao  text,
  categoria  text,                         -- 'hospedagem', 'apis', 'dominio', 'ferramentas'
  valor      numeric(12,2) not null,
  recorrente boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- anotacoes (com data de cumprimento extraída pela IA)
-- ---------------------------------------------------------------------------
create table anotacoes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  texto          text not null,
  tag            text,
  due            date,
  detected_by_ia boolean not null default false,
  concluida      boolean not null default false,
  cliente_id     uuid references clientes (id) on delete set null,
  projeto_id     uuid references projetos (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index on anotacoes (user_id, due);

-- ---------------------------------------------------------------------------
-- leads_pipeline (funil)
-- ---------------------------------------------------------------------------
create table leads_pipeline (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  cliente_id      uuid references clientes (id) on delete cascade,
  etapa           text not null,           -- 'contato', 'qualificado', 'proposta', 'fechado'
  valor_potencial numeric(12,2),
  motivo_perda    text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- eventos_agenda (alimenta agenda + notificações)
-- ---------------------------------------------------------------------------
create table eventos_agenda (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  titulo     text not null,
  tipo       text,                         -- 'entrega', 'reuniao', 'cobranca', 'prazo'
  quando     timestamptz not null,
  cliente_id uuid references clientes (id) on delete set null,
  projeto_id uuid references projetos (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on eventos_agenda (user_id, quando);

-- ===========================================================================
-- Row Level Security — dono-por-linha
-- ===========================================================================
alter table usuarios        enable row level security;
alter table clientes        enable row level security;
alter table historico       enable row level security;
alter table projetos        enable row level security;
alter table etapas          enable row level security;
alter table checklist_itens enable row level security;
alter table arquivos        enable row level security;
alter table recebimentos    enable row level security;
alter table assinaturas     enable row level security;
alter table custos          enable row level security;
alter table anotacoes       enable row level security;
alter table leads_pipeline  enable row level security;
alter table eventos_agenda  enable row level security;

-- usuarios: cada um vê/edita o próprio perfil
create policy "usuarios_self" on usuarios
  for all using (id = auth.uid()) with check (id = auth.uid());

-- helper macro (repetido por tabela pois Postgres não tem policy templates)
create policy "clientes_owner"        on clientes        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "projetos_owner"        on projetos        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recebimentos_owner"    on recebimentos    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "assinaturas_owner"     on assinaturas     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "custos_owner"          on custos          for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "anotacoes_owner"       on anotacoes       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leads_owner"           on leads_pipeline  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eventos_owner"         on eventos_agenda  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "arquivos_owner"        on arquivos        for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- etapas / checklist: dono via projeto pai
create policy "etapas_owner" on etapas for all
  using (exists (select 1 from projetos p where p.id = etapas.projeto_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projetos p where p.id = etapas.projeto_id and p.user_id = auth.uid()));
create policy "checklist_owner" on checklist_itens for all
  using (exists (select 1 from projetos p where p.id = checklist_itens.projeto_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projetos p where p.id = checklist_itens.projeto_id and p.user_id = auth.uid()));

-- historico: APPEND-ONLY. Só select e insert; sem update/delete (nunca apagar).
create policy "historico_select" on historico for select using (user_id = auth.uid());
create policy "historico_insert" on historico for insert with check (user_id = auth.uid());
