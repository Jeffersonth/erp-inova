# ERP Pessoal — Inova Labs

ERP pessoal para um **desenvolvedor freelancer** que atende clientes no Brasil e no
exterior. Cobre o ciclo completo: **lead → projeto → recebimento**, com **IA presente em
cada tela** sempre no padrão **"IA sugere → usuário aprova"**. É um PWA desktop-first,
responsivo para tablet/celular.

> Marca do produto: **inova labs**. Persona de exemplo nos dados mockados: *Rafael M., dev
> freelancer* (`rafael@inovalabs.com.br`).

## Fontes da verdade (ler antes de mexer no visual)

- **Design final (autoritativo):** [`Docs/design-source/erp-pessoal-para-freelancer/project/ERP Pessoal.dc.html`](Docs/design-source/erp-pessoal-para-freelancer/project/ERP%20Pessoal.dc.html) — export do Claude Design (claude.ai/design), **tema claro Inova Labs**. É o que estamos reconstruindo pixel-a-pixel.
- **Design mobile (autoritativo p/ responsividade + tela Hoje):** [`Docs/design-source/erp-pessoal-para-freelancer/project/ERP Pessoal Mobile.dc.html`](Docs/design-source/erp-pessoal-para-freelancer/project/ERP%20Pessoal%20Mobile.dc.html) — 5 abas (Hoje/Painel/IA/Notas/Finanças), header navy mobile e bottom nav; a aba **Hoje** é a Central de Trabalho.
- Protótipo funcional anterior (tema escuro, referência de interação/dados): [`Docs/dashboard-erp-prototipo.html`](Docs/dashboard-erp-prototipo.html).
- Especificação completa (features, IA por módulo, schema, roadmap): [`Docs/erp-pessoal-analise-e-melhorias-ia.md`](Docs/erp-pessoal-analise-e-melhorias-ia.md).
- Manual de marca: `Docs/design-source/.../uploads/Inova_Labs_Manual_de_Marca.pdf`.

⚠️ O `.dc.html` **evoluiu** para um **tema claro** (fundo `#F4F7FB`, sidebar navy). O
protótipo antigo era todo escuro — **use o `.dc.html` como referência visual**, não o escuro.

## Stack

- **Next.js 14** (App Router, `src/`, alias `@/*`) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix) + `lucide-react`
- **Supabase** (Postgres, Auth, Storage, Edge Functions, Realtime, pgvector) — único backend
- Fonte: **Inter**
- Roadmap posterior: TanStack Query + Zustand, Recharts, dnd-kit, Vercel AI SDK, Asaas

## Design system (tokens Inova Labs — tema claro)

Definidos como CSS vars em `src/app/globals.css` e mapeados no `tailwind.config.ts`.

| Token | Hex | Uso |
| :-- | :-- | :-- |
| `--bg` | `#F4F7FB` | fundo da app |
| `--card` | `#FFFFFF` | cards/painéis |
| `--soft` | `#F4F7FB` / `#EDF2F9` | fills sutis, colunas do kanban |
| `--line` | `#DCE4F0` | bordas/divisórias |
| `--text` | `#0B1220` | texto principal |
| `--mut` | `#64748B` | texto secundário (aux: `#8DA2C0`) |
| `--primary` | `#1D5BFF` | azul de ação (hover `#1848CC`) |
| `--cyan` | `#00D1FF` | acento/gradiente |
| `--green` | `#0E9F6E` | sucesso |
| `--red` | `#E5484D` | perigo/atraso |
| `--amber` | `#C77700` | alerta |
| IA fg / fill / line | `#0083A8` / `rgba(0,209,255,.10)` / `rgba(0,209,255,.45)` | selo/etiqueta "IA" |
| sidebar | `#0A1A33` | navy escuro, texto `#F4F7FB` |
| login | `#060F1F` | tela escura com blobs animados |

Convenções visuais: raio de card **12px**, botões **8–10px**, pills **99px**. Gradiente de
marca `linear-gradient(135deg,#1D5BFF,#00D1FF)`. **Tudo gerado por IA leva o selo roxo/ciano
"IA".** Densidade tipo Linear (fontes 10–13px, muito compactas).

Logo: wordmark `in` (sublinhado ciano) + `ova labs` + ponto ciano; símbolo = `in` em quadrado
com gradiente azul→ciano.

## Módulos (sidebar)

**Hoje (Central de Trabalho — 1ª tela após o login)** · Tarefas do dia · CRM · Prospecção
(CNPJ) · Projetos (quadro de tarefas) · Financeiro · Time Tracker · Agenda · Assistente IA ·
Anotações · Dashboard · Configurações. (Dashboard fica no fim, antes de Configurações.
Insights não é mais item de sidebar — virou seção no rodapé do Dashboard.)
No **mobile**, o shell segue o design mobile: header navy (quadrado gradiente "in" + título
da tela + avatar) e **bottom nav fixa** com 5 atalhos (◎ Hoje, ▣ Painel, ✦ IA, ✎ Notas,
$ Finanças); o menu completo continua no drawer (hambúrguer).
A **Central de Trabalho** (`/hoje`, `src/components/central-hoje.tsx` + `src/lib/central.ts`)
é a tela de execução: progresso do dia, cards Tarefas/A receber/Reuniões/Meta de horas
(meta em `usuarios.meta_horas_dia`, editável no perfil), "IA recomenda" com ação em 1 clique
(abre rascunho de cobrança/mensagem), sessão de foco pomodoro que grava em `sessoes_foco`,
Prioridade máxima (lê/escreve `tarefas_dia`) e Radar (vencidos, riscos, leads esfriando,
meta do mês).
Componente-chave reutilizado em todo o sistema: **modal "Rascunho da IA"** (título, selo
"Gerado por IA · revise antes de enviar", corpo editável, botões *Editar* / *Aprovar e
enviar*) + **toast** de confirmação.

## Banco de dados (Supabase) — conectado

Projeto real ativo (`stktqyttljgdopsdupcj`, região `sa-east-1`). Tabelas: `usuarios`,
`clientes`, `historico` (append-only, imutável), `projetos`, `etapas` (colunas do quadro do
projeto; `final = true` marca a etapa de conclusão), `tarefas` (cards do quadro, com `tipo`
e `concluida`), `checklist_itens`, `arquivos`, `recebimentos`, `assinaturas` (espelho do
Asaas), `custos` (despesas, com coluna `data`), `anotacoes`, `leads_pipeline`,
`eventos_agenda`, `tarefas_dia` (lista "Tarefas do dia": status
pendente/em_andamento/concluida, `data_finalizar`, `ordem` para drag-reorder). Migrações em
`supabase/migrations/` (`0001_init`, `0002_handle_new_user` — trigger que cria a linha em
`usuarios` no cadastro, `0003_restrict_handle_new_user_rpc`, `0004`/`0005` avatars storage,
`0006_tarefas_kanban_projeto` — quadro de tarefas + backfill de etapas,
`0007_recebimentos_pagamento_parcial` — vendas com valor_pago/data_pagamento,
`0008_custos_data`, `0009_tarefas_dia`, `0010_metas_financeiras`, `0011_arquivos_bucket`,
`0012_tarefas_descricao`, `0013_projeto_notas`, `0014_sessoes_foco`, `0015_agenda_eventos`,
`0016_avatars_owner_select_policy`, `0017_sessoes_foco_categoria`,
`0018_usuarios_meta_horas_dia`). RLS dono-por-linha (`user_id = auth.uid()`);
`historico` só permite SELECT/INSERT (nunca UPDATE/DELETE). Tipos gerados em
`src/lib/supabase/database.types.ts`.

**Auth real**: login/cadastro via Supabase Auth (`src/components/login-form.tsx`), sessão via
cookies com `@supabase/ssr` (`src/middleware.ts` renova o token a cada request). Rotas
`(app)/*` são protegidas em `src/app/(app)/layout.tsx` (redireciona para `/login` sem
sessão); `/login` redireciona para `/dashboard` se já autenticado. Confirmação de e-mail está
ligada no projeto — usuários novos recebem "verifique seu e-mail" (não há SMTP configurado
para dev, então confirme manualmente via SQL: `update auth.users set email_confirmed_at =
now() where email = '...'`).

**Dados reais vs. ilustrativos (Fase 1):** CRM, Projetos (kanban com persistência de status
ao arrastar) e Financeiro (contas a receber, assinaturas/MRR) leem do Supabase de verdade.
Dashboard mistura KPIs reais (projetos ativos, leads ativos, a receber 30d, MRR) com gráficos
de IA ainda ilustrativos (previsão de caixa, lucro por cliente) — isso é proposital, veja
Fase 3 no roadmap. Anotações tem CRUD real (insert/update client-side).

## IA real (Fase 2) — Anthropic API

Usa `@anthropic-ai/sdk` server-only (`src/lib/ai/client.ts`), lendo `ANTHROPIC_API_KEY` de
`.env.local` (nunca exposta ao browser). Estratégia de custo do próprio spec do produto:
**Opus 4.8** para assistente conversacional e geração de rascunhos (qualidade), **Haiku 4.5**
para o resumo diário (tarefa rotineira).

- **Assistente** (`src/app/(app)/assistente/page.tsx` + `POST /api/assistente`): chat real
  com *tool calling* — `src/lib/ai/tools.ts` define 4 tools (`buscar_clientes`,
  `buscar_projetos`, `buscar_financeiro`, `buscar_anotacoes`) que consultam o Postgres via o
  client autenticado da requisição (RLS restringe tudo a `auth.uid()`). Loop manual de
  tool-use, capado em 4 iterações.
- **Rascunhos** (`POST /api/draft` + `src/components/ai-draft-button.tsx` +
  `openAiDraft` em `app-providers.tsx`): gera cobranças/mensagens reais com os dados do
  cliente/recebimento, abre no mesmo modal "Rascunho da IA" de sempre. Usado em CRM
  (`tipo: "mensagem_cliente"`) e Financeiro (`tipo: "cobranca"`).
- **Resumo diário** (`src/lib/ai/resumo.ts`, chamado direto do Server Component do
  Dashboard): 1 parágrafo curto via Haiku a partir dos KPIs reais.
- O catálogo estático antigo (`src/lib/mock-data.ts` → `drafts`, usado por
  `src/components/draft-button.tsx` / `DraftButton`) continua servindo os botões sem dados
  reais modelados ainda: `anomalia` (Dashboard), `prazosIA` e `contrato` (Projetos — exigem
  mais contexto/escrita de volta no banco que ainda não foi implementada).
- Toda função de IA tem fallback silencioso em caso de erro (`try/catch` retornando texto
  padrão ou toast) — a tela nunca quebra se a API da Anthropic falhar ou o saldo da conta
  estiver baixo.
- **Não implementado ainda:** busca semântica (pgvector) — exige tabela `biblioteca` +
  pipeline de embeddings, e não há conteúdo para indexar ainda; ficou para quando houver uso
  real da Biblioteca.

## Roadmap

- **Fase 1 (concluída):** Dashboard, CRM + histórico, Projetos, Financeiro básico, Login —
  Supabase real (Auth + Postgres + RLS), não mais só dados mockados. Projetos evoluiu de um
  kanban de "projetos como cards" para um **quadro de tarefas por projeto**: seletor de
  projetos no topo, colunas = etapas (editáveis por projeto, com etapa final de conclusão),
  cards coloridos por tipo (`dev`/`design`/`conteudo`/`reuniao`/`bug`), drag-and-drop entre
  etapas, concluir card com destaque e barra de progresso automática (`projetos.progresso`
  derivado de % de tarefas concluídas). Ver `src/components/project-board.tsx`.
- **Fase 2 (parcial):** Assistente global com tools ✅, geração de propostas/cobranças ✅,
  resumo diário ✅ — busca semântica ainda não implementada (ver seção "IA real" acima).
- **Fase 3 (parcial):** seção **Insights** no rodapé do Dashboard (não é mais aba própria —
  movida pra dentro do Dashboard) com previsão de receita 90d (3 cenários), lucro por
  cliente, risco de atraso de projetos e risco de inadimplência — cálculos determinísticos
  reais em `src/lib/insights.ts` + narrativa da IA (Opus) em Suspense
  (`src/lib/ai/insights-narrativa.ts`). **Lead scoring** real no CRM: `score_ia` e
  `proxima_acao_ia` recomputados por regras via `POST /api/crm/recalcular` (botão "Recalcular
  scores"). Dashboard tem "Atenção necessária" real (contas em atraso, projetos em risco,
  leads esfriando) e um KPI de "Horas de foco · mês" (soma de `sessoes_foco` do tipo foco).
  Automações com scheduler ainda não (sugestões são as "próximas ações").
- **Fase 4 (parcial):** **Prospecção por CNPJ** (`/prospeccao`) via BrasilAPI (grátis, sem
  chave) — `POST /api/prospeccao/cnpj` + botões "Criar lead" / "Criar cliente" (grava direto
  com `status: "lead"` ou `"cliente"` em `clientes`). **WhatsApp** via link `wa.me`
  (botão "Enviar no WhatsApp" no modal de rascunho, usa o telefone do cliente; sem API).
  Ainda faltam: WhatsApp Business API oficial, portal do cliente, Asaas real (todos dependem
  de conta/credencial externa).

## Comandos

```bash
npm run dev      # dev server (localhost:3000)
npm run build    # build de produção
npm run lint     # eslint
```

Variáveis de ambiente em `.env.local` (não versionado — ver `.env.example`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Convenções de código

- Componentes de tela em `src/app/(app)/<modulo>/page.tsx` (Server Components, buscam dados
  via `src/lib/supabase/server.ts`); login em `src/app/login/page.tsx`.
- UI compartilhada em `src/components/` (shadcn em `src/components/ui/`). Telas com
  interação client-side (quadro de tarefas com drag-and-drop, chat, anotações, modal) delegam
  para um Client Component correspondente (`project-board.tsx`, `notes-board.tsx`,
  `login-form.tsx`) que usa `src/lib/supabase/client.ts`.
- Conteúdo ainda ilustrativo/estático (charts de IA, catálogo de rascunhos) em
  `src/lib/mock-data.ts` — trocar por geração real na Fase 2/3.
- Textos da UI em **português (pt-BR)**.
