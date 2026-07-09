# ERP Pessoal — Análise e Melhorias com IA

Análise da sua especificação, módulo a módulo, com melhorias de IA integradas em cada função e o detalhamento da aba Dashboard.

---

## Avaliação geral

A ideia está bem estruturada. Os pontos fortes: cobre o ciclo completo (lead → projeto → recebimento), histórico imutável do cliente, e a stack recomendada é sólida e atual. Os pontos que merecem atenção antes de desenvolver:

1. **Escopo grande demais para uma v1.** São \~18 módulos. Recomendo uma v1 com: Dashboard, CRM, Projetos (Kanban), Financeiro e Agenda. O resto entra em fases.  
2. **IA como camada transversal, não como módulo isolado.** Em vez de "IA Integrada" ser uma aba, a IA deve permear cada módulo (detalhado abaixo), com um assistente global por cima.  
3. **Falta um modelo de dados unificado de "atividades".** Histórico do cliente, follow-ups, notificações e agenda devem nascer da mesma tabela de eventos — isso simplifica muito e é o que alimenta a IA.  
4. **Custo de IA**: use um modelo barato (ex: Haiku) para classificações e resumos rotineiros, e um modelo forte só para geração de propostas/contratos e o assistente conversacional.

---

## 1\. Dashboard Principal (aba dedicada)

Primeira aba do sistema, pensada para leitura em 10 segundos: "como está meu negócio hoje?"

### Estrutura em 4 faixas

**Faixa 1 — Resumo do dia (gerado por IA)** Um parágrafo em linguagem natural no topo, atualizado ao abrir:

"Bom dia, Jefferson. Você tem 12 tarefas hoje, 2 entregas esta semana e 3 projetos atrasados. O pagamento da Clínica Souza (R$ 3.500) vence amanhã. Prioridade sugerida: finalizar os ajustes do site da Imobiliária Prado, que vence hoje."

**Faixa 2 — Cartões de KPI** (com comparação vs. mês anterior e seta ▲▼)

| Cartão | Valor | Extra didático |
| :---- | :---- | :---- |
| Clientes ativos | 28 | \+3 vs. mês passado |
| Projetos em andamento | 16 | 3 atrasados (em vermelho, clicável) |
| A receber este mês | R$ 42.000 | barra: recebido vs. pendente |
| Recebido | R$ 21.800 | 52% da meta do mês |
| Pendente | R$ 20.200 | 2 vencem em 7 dias |
| Tarefas hoje | 12 | 4 alta prioridade |
| Leads novos | 8 | taxa de conversão 25% |
| Lucro do mês | R$ X | receita − custos (módulo de custos) |

Cada cartão é clicável e leva à lista filtrada correspondente — didático porque o número nunca é um beco sem saída.

**Faixa 3 — Gráficos**

- Receita mensal: barras dos últimos 12 meses, com **linha pontilhada de previsão dos próximos 3 meses feita por IA** (baseada em contas a receber \+ histórico).  
- Funil de conversão de leads: funil visual Novo → Contato → Proposta → Fechado, com % em cada etapa.  
- Projetos concluídos por mês: barras.  
- Fluxo de caixa: entradas vs. saídas, com saldo acumulado.

**Faixa 4 — Atenção necessária (curada por IA)** Lista curta e priorizada: pagamentos atrasados, projetos parados há X dias, clientes sem contato há 30+ dias, follow-ups vencidos. A IA ordena por impacto financeiro, não por data.

### Melhorias de IA no dashboard

- Resumo diário em linguagem natural (acima).  
- Previsão de receita com base no pipeline e histórico.  
- Detecção de anomalias: "sua receita de julho está 30% abaixo da média — 2 propostas grandes estão paradas há 10 dias".  
- Modo "fim do dia": resumo do que foi feito e sugestão do plano de amanhã.

---

## 2\. CRM

Cadastro e status estão bons. Melhorias:

- **Campo "Valor potencial"** no lead (essencial para o funil e previsões).  
- **Campo "Última interação"** calculado automaticamente do histórico.  
- **Campo "País"** (com moeda e fuso associados) \+ **mapa de clientes por país** no CRM: pontos dimensionados pelo nº de clientes, com receita por país ao lado. A IA cruza país × ticket × conversão e sugere onde prospectar (ex: "clientes internacionais pagam 35% mais e nunca atrasam"). Para clientes fora do Brasil, o CNPJ vira campo opcional (usar VAT/Tax ID) e a cobrança pode usar moeda estrangeira.

**IA no CRM:**

- **Enriquecimento por CNPJ**: digitou o CNPJ, a IA busca razão social, endereço, porte e ramo, e sugere a etiqueta (Advogado, Médico, etc.).  
- **Lead scoring**: nota de 0–100 por lead com base em origem, ramo, valor e velocidade de resposta, aprendendo com seu histórico de fechamentos.  
- **Resumo do cliente em 1 clique**: "Cliente desde 03/2025, 2 projetos entregues, ticket médio R$ 4.500, paga em dia, prefere WhatsApp."  
- **Sugestão de próxima ação** em cada ficha: "Sem contato há 22 dias — sugerir mensagem de acompanhamento?" (com a mensagem já rascunhada).

**Histórico do cliente:** manter imutável, como você definiu. Adicionar: registro automático de eventos do sistema (proposta enviada, pagamento recebido) além dos manuais, e **resumo do histórico por IA** para clientes com muitas entradas.

---

## 3\. Projetos

Estrutura (Kanban \+ barra de progresso \+ checklist) está correta. Melhorias:

- Barra de progresso **calculada** do checklist \+ etapa do Kanban, não manual.  
- Campo "Horas estimadas" (prepara o controle de horas do roadmap).  
- **Prazo por etapa**: além da entrega final, cada etapa do Kanban (Briefing, Layout, Desenvolvimento, Testes, Ajustes, Publicação) tem seu próprio prazo. Etapas atrasadas alimentam os alertas, a agenda e o cálculo de risco. A IA distribui os prazos automaticamente a partir da data de entrega, com base na duração média das suas etapas em projetos do mesmo tipo.  
- **Arquivos por projeto**: cada projeto armazena contrato, nota fiscal, PDFs, docs e imagens enviadas pelo cliente (Supabase Storage). No upload, a IA classifica o arquivo (contrato / NF / imagem / doc / briefing), vincula ao projeto certo, extrai dados (valor e data da NF → conciliação no Financeiro) e marca itens do checklist (ex: logo recebido).

**IA em Projetos:**

- **Geração do plano do projeto**: a partir do briefing, a IA gera etapas, checklist e estimativa de prazo com base em projetos parecidos que você já fez.  
- **Alerta preditivo de atraso**: "Este projeto está na etapa Layout há 8 dias; seus projetos similares levam 4\. Risco de atrasar a entrega de 20/07."  
- **Checklist inteligente por tipo**: template de checklist diferente para Site, Landing Page, App, Agente IA — e a IA marca itens automaticamente quando detecta (ex: cliente enviou logo pela central de documentos).  
- **Resumo de status para o cliente**: gera a mensagem de atualização de progresso pronta para enviar.

---

## 4\. Financeiro

Adicionar: **recorrência** (mensalidades de manutenção/hospedagem geram cobranças automáticas) e **conciliação** simples (marcar recebido em lote).

### Pagamentos recorrentes com Asaas

Integração via API do Asaas (REST \+ webhooks):

- **Assinaturas**: criar a assinatura no Asaas direto do ERP (cliente, plano, valor, ciclo, forma: PIX, boleto ou cartão). O Asaas gera as cobranças automaticamente a cada ciclo.  
- **Baixa automática**: webhook `PAYMENT_RECEIVED` marca o recebimento no ERP e registra no histórico do cliente — sem conciliação manual.  
- **Cartão recusado**: webhook de falha dispara o retry do Asaas e a IA rascunha o aviso ao cliente com link de pagamento alternativo.  
- **Inadimplência**: webhook `PAYMENT_OVERDUE` alimenta o score de risco e a régua de cobrança da IA (1º aviso amigável → 2º firme → negociação sugerida).  
- **MRR no dashboard**: receita recorrente mensal como KPI, com sugestões da IA de quais clientes converter para plano recorrente após a entrega.  
- Implementação: Edge Function do Supabase como endpoint dos webhooks; token do Asaas guardado em secret; sandbox do Asaas para testes.

**IA no Financeiro:**

- **Previsão de fluxo de caixa 90 dias**: combina contas a receber, recorrências, custos fixos e probabilidade de fechamento dos leads.  
- **Score de risco de inadimplência** por cliente, baseado no histórico de atrasos.  
- **Cobrança redigida por IA**: no vencimento, gera a mensagem de cobrança no tom certo (1º aviso amigável, 2º mais firme) para aprovar e enviar.  
- **Sugestão de preço**: ao criar proposta, sugere valor com base no seu ticket médio por tipo de projeto e porte do cliente.

---

## 5\. Agenda, Tarefas e Notificações

Unificar os três em um só motor de eventos (mesma tabela alimenta calendário, barra de tarefas e notificações).

**IA:**

- **Priorização automática do dia**: ordena as tarefas por impacto (valor do projeto, proximidade do prazo, cliente em risco), não só por data.  
- **Criação de tarefa por linguagem natural**: "reunião com a Dra. Paula quinta 15h sobre o site" → cria evento, vincula ao cliente e ao projeto.  
- **Notificações inteligentes**: em vez de 15 alertas, um digest diário priorizado. Alertas individuais só para o crítico.

---

## 6\. Documentos, Propostas e Contratos

**IA:**

- **Geração de proposta completa**: seleciona cliente \+ serviço e a IA redige a proposta inteira (escopo, entregáveis, prazo, condições) usando seus templates e propostas anteriores que fecharam. Gera o PDF.  
- **Contratos gerados pela IA com exportação em PDF**: a IA puxa os dados do CRM e do projeto (partes, CNPJ, endereço, valor, forma de pagamento, prazos por etapa, escopo), monta o contrato a partir do seu modelo, revisa apontando cláusulas faltantes para o tipo de serviço (ex: confidencialidade para clientes da saúde), e exporta o PDF pronto para assinatura digital. O PDF assinado é salvo automaticamente nos arquivos do projeto e registrado no histórico do cliente.  
- **OCR e classificação**: upload de qualquer arquivo → IA identifica o que é (contrato, logo, briefing), vincula ao cliente certo e extrai dados (valores, datas de vencimento).  
- **Busca semântica**: "o contrato daquele restaurante que assinamos em março" encontra o arquivo.

---

## 7\. Gestão de Leads e Follow-up

**IA:**

- **Follow-up automático sugerido**: para cada lead parado, a IA sugere quando e o que falar, com a mensagem rascunhada no seu tom.  
- **Análise de perda**: ao marcar "Perdido", pede o motivo e periodicamente gera insight: "60% das perdas em Q2 foram por preço, concentradas em leads de Instagram."  
- **Transcrição de reunião → CRM**: cola a transcrição (ou áudio) da call e a IA extrai requisitos, orçamento mencionado e próximos passos direto para a ficha do lead.

---

## 8\. Anotações com prazo

Aba dedicada de anotações rápidas, cada uma com **data para cumprir**:

- Escrita em linguagem natural: "cobrar Maria amanhã", "enviar orçamento sexta", "renovar domínio 15/07" — a **IA extrai a data**, cria o prazo e adiciona à agenda automaticamente.  
- Agrupamento automático: Atrasadas, Hoje, Próximas, Sem prazo, Concluídas. Anotação sem data vira ideia; se parecer tarefa, a IA sugere um prazo.  
- Concluir marca no resumo do dia; atrasadas entram nos alertas priorizados.  
- Vinculação automática: se a anotação menciona um cliente/projeto existente, a IA vincula à ficha.

## 9\. Banco de Ideias, Base de Conhecimento e Templates

Unificar os três como uma "Biblioteca" com tipos diferentes.

**IA:**

- **Busca semântica** em tudo (prompts, snippets, ideias, templates).  
- **Auto-organização**: cola qualquer coisa e a IA classifica, titula e etiqueta.  
- **Templates que aprendem**: quando você edita uma mensagem gerada antes de enviar, a IA registra sua preferência de tom para as próximas.

---

## 10\. Hospedagem, Licenças e Custos

**IA:**

- **Alertas preditivos**: domínio/SSL/licença vencendo → entra no digest diário e vira tarefa.  
- **Lucro por cliente calculado**: receita recorrente − (hospedagem \+ APIs \+ domínio \+ tempo). A IA aponta: "O cliente X te dá R$ 150/mês de lucro mas consome 8h/mês. O cliente Y rende 3x mais por hora."  
- **Detecção de custo anômalo**: "Sua conta OpenAI subiu 40% este mês, puxada pelo agente do cliente Z."

---

## 11\. Automações

Evoluir de botões para **regras (gatilho → ação)** que a IA sugere com base no seu comportamento: "Você sempre envia mensagem de boas-vindas ao mover lead para Fechado. Quer automatizar?"

Ações em lote por comando: "envie cobrança para todos os pagamentos que vencem esta semana" → IA lista, você aprova, sistema dispara.

---

## 12\. Assistente Global (o diferencial)

Suas perguntas de exemplo estão ótimas. Para funcionar bem:

- **Arquitetura**: assistente com acesso a *tools* (funções que consultam o banco), não a um dump do banco no prompt. Cada pergunta vira consultas estruturadas — respostas precisas e baratas.  
- **Ações, não só respostas**: "gere um e-mail cobrando o João" → gera, mostra para aprovar, envia e **registra no histórico do cliente**.  
- **Sempre com confirmação** para ações que enviam algo ou mexem em dinheiro.  
- **Memória de contexto**: "e o outro projeto dele?" funciona dentro da conversa.  
- Acessível de qualquer tela (atalho tipo Cmd+K).

---

## 13\. Configurações e usuários

- **Tela de login refinada**: split em duas colunas (branding com destaques do produto à esquerda, formulário à direita), glassmorphism sobre fundo com gradientes suaves animados, e-mail/senha com mostrar senha, "lembrar de mim", recuperação de senha e login com Google (Supabase Auth).  
- **Cadastro do usuário administrador com foto**: nome, e-mail, telefone, função e avatar (upload para o Supabase Storage). A foto aparece na sidebar, nas propostas, no portal do cliente e nas mensagens enviadas — reforça a marca pessoal.  
- **Múltiplos usuários com permissões por módulo**: administrador (acesso total), gestor, colaborador (ex: designer sem acesso ao Financeiro). Supabase Auth \+ RLS resolve isso nativamente.  
- Integrações (Asaas, IA, WhatsApp), tema claro/escuro, backup, dados da empresa e logo.

## 14\. Relatórios

**IA:** relatório mensal/anual **narrado** — além dos números, um texto executivo: o que melhorou, o que piorou, 3 recomendações. Perguntas ad-hoc via assistente ("qual meu ticket médio em sites vs. apps?") substituem a maioria dos relatórios fixos.

---

## Banco de dados — Supabase (decisão confirmada)

**Todo o dado do sistema vive no PostgreSQL do Supabase.** Auth, Storage, Edge Functions e Realtime também são do Supabase — um único backend para tudo.

### Esquema inicial (tabelas principais)

| Tabela | Conteúdo |
| :---- | :---- |
| `usuarios` | perfil do admin e colaboradores (nome, email, telefone, função, **avatar\_url** → Storage) |
| `clientes` | cadastro completo do CRM \+ país, moeda, score IA, origem, etiquetas |
| `historico` | eventos imutáveis do cliente (append-only, **nunca apagar** — sem UPDATE/DELETE via RLS) |
| `projetos` | título, valor, status, datas, responsável, cliente\_id |
| `etapas` | etapas do Kanban **com prazo individual**, status e datas reais (projeto\_id) |
| `checklist_itens` | itens por projeto, com flag de marcação automática pela IA |
| `arquivos` | metadados dos uploads (contrato, NF, imagem, doc) → arquivo no **Supabase Storage**, classificação da IA, vínculo a projeto/cliente |
| `recebimentos` | contas a receber, forma de pagamento, status, parcelas |
| `assinaturas` | recorrências espelhadas do **Asaas** (asaas\_subscription\_id, ciclo, status, churn\_score) |
| `custos` | custos por cliente (hospedagem, APIs, domínio) para lucro líquido |
| `anotacoes` | texto, **data de cumprimento** (extraída pela IA), concluída, vínculo opcional a cliente/projeto |
| `leads_pipeline` | etapa do funil, valor potencial, motivo de perda |
| `eventos_agenda` | entregas, reuniões, cobranças, prazos (alimenta agenda \+ notificações) |
| `biblioteca` | ideias, prompts, snippets, templates (com embedding pgvector) |

### Recursos do Supabase usados

- **Auth**: login e-mail/senha \+ Google (a tela de login do protótipo), perfis com permissão por módulo via **RLS** (Row Level Security).  
- **Storage**: fotos de perfil, contratos em PDF, notas fiscais, imagens e docs dos clientes — buckets por tipo, com política de acesso por usuário.  
- **Edge Functions**: webhooks do Asaas (baixa automática, cartão recusado), chamadas à API de IA (rascunhos, classificação de arquivos, previsões) e geração de PDF de contratos/propostas.  
- **pgvector**: embeddings para busca semântica em clientes, arquivos e biblioteca.  
- **pg\_cron**: digest diário, alertas de vencimento (domínio, SSL, licenças) e follow-ups.  
- **Realtime**: atualização ao vivo do Kanban e do dashboard.  
- **Migrations**: todo o esquema versionado (Claude Code gera e aplica via CLI do Supabase — desenvolver local com `supabase start` e aplicar na nuvem depois).

## Stack — ajustes sugeridos

Sua stack está boa. Complementos para a camada de IA:

- **IA**: Vercel AI SDK \+ API da Anthropic/OpenAI, rodando em Edge Functions do Supabase ou route handlers do Next.  
- **Busca semântica**: pgvector (extensão nativa do Supabase) — embeddings de clientes, documentos e biblioteca.  
- **Assistente com tools**: function calling consultando o Postgres via RPC.  
- **Filas/agendamentos**: pg\_cron \+ Edge Functions para digests, alertas e follow-ups.  
- Mantenha: Next.js \+ TS, Tailwind \+ shadcn/ui, Drizzle, Zod, TanStack Query \+ Zustand, Recharts, dnd-kit, FullCalendar, Sonner, next-pwa, Vercel.  
- **Banco de dados: Supabase (PostgreSQL) — confirmado.** Ver seção "Banco de dados — Supabase" acima com o esquema inicial.

---

## Roadmap sugerido

**Fase 1 (v1, \~núcleo):** Dashboard (sem previsões), CRM \+ histórico, Projetos com Kanban/checklist, Financeiro básico, Agenda/tarefas.

**Fase 2 (IA essencial):** Assistente global com tools, resumo diário do dashboard, geração de propostas/cobranças, busca semântica.

**Fase 3 (IA avançada):** Previsões (receita, atraso, inadimplência), lead scoring, automações sugeridas, análise de perda, lucro por cliente.

**Fase 4 (roadmap original):** WhatsApp, portal do cliente, controle de horas, prospecção por CNPJ.  
