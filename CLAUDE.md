# ERP Pessoal — Inova Labs

ERP pessoal para um **desenvolvedor freelancer** que atende clientes no Brasil e no
exterior. Cobre o ciclo completo: **lead → projeto → recebimento**, com **IA presente em
cada tela** sempre no padrão **"IA sugere → usuário aprova"**. É um PWA desktop-first,
responsivo para tablet/celular.

> Marca do produto: **inova labs**. Persona de exemplo nos dados mockados: *Rafael M., dev
> freelancer* (`rafael@inovalabs.com.br`).

## Fontes da verdade (ler antes de mexer no visual)

- **Design final (autoritativo):** [`Docs/design-source/erp-pessoal-para-freelancer/project/ERP Pessoal.dc.html`](Docs/design-source/erp-pessoal-para-freelancer/project/ERP%20Pessoal.dc.html) — export do Claude Design (claude.ai/design), **tema claro Inova Labs**. É o que estamos reconstruindo pixel-a-pixel.
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

Dashboard · CRM · Projetos (kanban) · Financeiro · Assistente IA · Anotações · Configurações.
Componente-chave reutilizado em todo o sistema: **modal "Rascunho da IA"** (título, selo
"Gerado por IA · revise antes de enviar", corpo editável, botões *Editar* / *Aprovar e
enviar*) + **toast** de confirmação.

## Banco de dados (Supabase) — conectado

Projeto real ativo (`stktqyttljgdopsdupcj`, região `sa-east-1`). Tabelas: `usuarios`,
`clientes`, `historico` (append-only, imutável), `projetos`, `etapas` (prazo por etapa),
`checklist_itens`, `arquivos`, `recebimentos`, `assinaturas` (espelho do Asaas), `custos`,
`anotacoes`, `leads_pipeline`, `eventos_agenda`. Migrações em `supabase/migrations/`
(`0001_init`, `0002_handle_new_user` — trigger que cria a linha em `usuarios` no cadastro,
`0003_restrict_handle_new_user_rpc`). RLS dono-por-linha (`user_id = auth.uid()`);
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
Dashboard mistura KPIs reais (projetos ativos, leads ativos, a receber 30d, MRR) com
conteúdo narrativo de IA ainda ilustrativo (resumo do dia, anomalia, previsão de caixa,
lucro por cliente) — isso é proposital, veja Fase 3 no roadmap. Anotações tem CRUD real
(insert/update client-side). O catálogo de rascunhos de IA (`src/lib/mock-data.ts` →
`drafts`) continua estático até a Fase 2; a ligação cliente→draft é por nome (os 6 clientes
seedados usam os mesmos nomes do catálogo original).

## Roadmap

- **Fase 1 (concluída):** Dashboard, CRM + histórico, Projetos (kanban/checklist),
  Financeiro básico, Login — agora com Supabase real (Auth + Postgres + RLS), não mais só
  dados mockados. *(previsões/resumos de IA ainda ilustrativos — ver Fase 3)*
- **Fase 2:** Assistente global com tools, resumo diário, geração de propostas/cobranças, busca semântica.
- **Fase 3:** Previsões (receita, atraso, inadimplência), lead scoring, automações, lucro por cliente.
- **Fase 4:** WhatsApp, portal do cliente, controle de horas, prospecção por CNPJ.

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
  interação client-side (kanban drag-and-drop, chat, anotações, modal) delegam para um
  Client Component correspondente (`kanban-board.tsx`, `notes-board.tsx`, `login-form.tsx`)
  que usa `src/lib/supabase/client.ts`.
- Conteúdo ainda ilustrativo/estático (charts de IA, catálogo de rascunhos) em
  `src/lib/mock-data.ts` — trocar por geração real na Fase 2/3.
- Textos da UI em **português (pt-BR)**.
