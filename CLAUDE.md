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

## Banco de dados (Supabase) — tabelas Fase 1

`usuarios`, `clientes`, `historico` (append-only, imutável), `projetos`, `etapas` (prazo por
etapa), `checklist_itens`, `arquivos`, `recebimentos`, `assinaturas` (espelho do Asaas),
`custos`, `anotacoes`, `leads_pipeline`, `eventos_agenda`, `biblioteca` (pgvector). Migração
inicial em `supabase/migrations/`. RLS por usuário/módulo. `historico` nunca recebe
UPDATE/DELETE.

## Roadmap

- **Fase 1 (v1 — em andamento):** Dashboard, CRM + histórico, Projetos (kanban/checklist),
  Financeiro básico, Login. *(sem previsões de IA reais ainda — telas com dados mockados)*
- **Fase 2:** Assistente global com tools, resumo diário, geração de propostas/cobranças, busca semântica.
- **Fase 3:** Previsões (receita, atraso, inadimplência), lead scoring, automações, lucro por cliente.
- **Fase 4:** WhatsApp, portal do cliente, controle de horas, prospecção por CNPJ.

## Comandos

```bash
npm run dev      # dev server (localhost:3000)
npm run build    # build de produção
npm run lint     # eslint
```

Variáveis de ambiente em `.env.local` (ver `.env.example`):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Convenções de código

- Componentes de tela em `src/app/(app)/<modulo>/page.tsx`; login em `src/app/login/page.tsx`.
- UI compartilhada em `src/components/` (shadcn em `src/components/ui/`).
- Dados mockados da Fase 1 em `src/lib/mock-data.ts` — trocar por queries Supabase nas fases seguintes.
- Preferir Server Components; usar `"use client"` só onde há interação (kanban, chat, modais).
- Textos da UI em **português (pt-BR)**.
