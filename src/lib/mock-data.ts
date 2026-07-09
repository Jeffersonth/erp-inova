// Dados de exemplo da Fase 1 (extraídos de "ERP Pessoal.dc.html").
// Substituir por queries do Supabase nas fases seguintes.

export type Tone = "ok" | "amber" | "danger" | "brand" | "mut";

/* ------------------------------------------------------------------ */
/* Rascunhos da IA (catálogo usado pelo modal em todo o sistema)       */
/* ------------------------------------------------------------------ */
export type Draft = {
  title: string;
  cta?: string;
  done?: string;
  body: string;
};

export const drafts: Record<string, Draft> = {
  cobrancaAcme: {
    title: "Cobrança — Acme Co. (fatura #042)",
    done: "✓ Lembrete enviado e registrado no histórico da Acme Co.",
    body: `Olá, João! Tudo bem?

Passando para lembrar que a fatura #042, no valor de R$ 4.200, vence amanhã.

Segue o PIX para facilitar: financeiro@inovalabs.com.br
Qualquer dúvida, é só me chamar. Obrigado!`,
  },
  cobrancaLex: {
    title: "Cobrança — Lex Advocacia (fatura #038)",
    cta: "✓ Aprovar e enviar (tom firme)",
    done: "✓ 2ª cobrança enviada e registrada no histórico da Lex",
    body: `Olá, Dra. Camila.

A fatura #038, de R$ 2.100, está em aberto há 8 dias. Para mantermos o serviço em dia, preciso da confirmação do pagamento até sexta.

Se houver qualquer dificuldade, me avise que encontramos uma solução — posso parcelar em 2x.

Segue o PIX: financeiro@inovalabs.com.br`,
  },
  followupNordic: {
    title: "Follow-up — Nordic AS",
    done: "✓ Follow-up enviado para Ingrid e registrado no histórico",
    body: `Hi Ingrid, hope you're doing well!

Just following up on the US$ 3.500 proposal I sent last week. Did you have a chance to review it?

If timing is the issue, we could start with a lighter first phase. Would a quick call on Thursday work for you?

Best,
Rafael`,
  },
  upsellAcme: {
    title: "Proposta de manutenção — Acme Co.",
    done: "✓ Proposta de plano enviada e registrada no histórico",
    body: `Oi, João!

Agora que a loja está no ar e estável, sugiro um plano de manutenção mensal (R$ 520/mês):

• Hospedagem + SSL + backup diário
• Até 4 alterações de conteúdo por mês
• Monitoramento e suporte prioritário

Assim você fica tranquilo e eu garanto o site sempre no ar. Fechamos?`,
  },
  reviewBloom: {
    title: "Review trimestral — Bloom GmbH",
    done: "✓ Convite de review enviado para Ana",
    body: `Hallo Ana!

It's time for our quarterly review of the health dashboard. I'd like to walk you through what shipped this sprint and align on the next one.

I also have the € 4.000 invoice ready to share. Does next Tuesday at 10:00 (CET) work?`,
  },
  reengajarLex: {
    title: "Reengajamento — Lex Advocacia",
    done: "✓ Mensagem de reengajamento enviada",
    body: `Olá, Dra. Camila! Quanto tempo.

Lembrei da Lex ao finalizar o painel de indicadores da Bloom — reduziu em 6h/semana o trabalho manual do time deles.

Acho que faria muito sentido para o escritório. Topa uma conversa rápida de 15 min esta semana?`,
  },
  retainerHudson: {
    title: "Estimativa de retainer — Hudson Media",
    done: "✓ Estimativa enviada para Mike",
    body: `Hi Mike,

Here's the monthly retainer estimate we discussed — US$ 1,200/month covering:

• Up to 20 dev hours
• Priority support (same-day)
• Monthly performance report

Happy to adjust the scope. Want me to send the agreement to sign?`,
  },
  callVela: {
    title: "Convite para call — Vela Fitness",
    done: "✓ Convite enviado para Paula",
    body: `Oi, Paula! Tudo bem?

Adorei o contexto que você passou sobre o app da Vela. Que tal uma call de descoberta de 30 min para eu entender melhor o objetivo e já trazer um caminho?

Tenho quinta às 15h ou sexta às 10h — qual fica melhor?`,
  },
  contrato: {
    title: "Contrato — Landing X",
    cta: "📄 Exportar PDF e enviar p/ assinatura",
    done: "✓ PDF gerado, salvo em Arquivos do projeto e enviado para assinatura",
    body: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS
Desenvolvimento de landing page

CONTRATANTE: Acme Co. · CNPJ 12.345.678/0001-90
CONTRATADO: Rafael M. (inova labs) · CNPJ 11.222.333/0001-44

OBJETO: desenvolvimento da landing page "Landing X", conforme escopo aprovado.
VALOR: R$ 1.500 — 50% na assinatura e 50% na entrega.
PRAZO: entrega em 11/07/2026, etapas conforme cronograma do projeto.
INCLUI: 2 rodadas de ajustes, deploy, SSL.

✅ Campos preenchidos pela IA a partir do CRM e do projeto.
⚠️ Revisão da IA: adicionada cláusula de propriedade intelectual (5ª).`,
  },
  prazosIA: {
    title: "Distribuição de prazos — Landing X",
    cta: "✓ Aplicar prazos",
    done: "✓ Prazos aplicados às etapas e adicionados à agenda",
    body: `Com a entrega final em 11/07, a distribuição sugerida é:

• Briefing → 28/06 (2 dias)
• Design → 02/07 (3 dias)
• Desenvolvimento → 09/07 (5 dias) ⚠ já em 7 dias
• Revisão do cliente → 10/07 (1 dia)
• Deploy → 11/07 (1 dia)

⚠️ O desenvolvimento passou da média (5d). Risco de atraso: 78%.
Sugiro mover a revisão da Loja Acme para liberar a quinta inteira.`,
  },
  anomalia: {
    title: "Anomalia de custo — Ferramentas & SaaS",
    cta: "✓ Marcar como revisado",
    done: "✓ Anomalia revisada",
    body: `O gasto com "Ferramentas & SaaS" este mês foi de R$ 918 — 3,2× a média dos últimos 6 meses (R$ 287).

Principais variações detectadas:
• Nova assinatura anual cobrada de uma vez
• 2 ferramentas com uso próximo de zero nos últimos 30 dias

Sugestão: cancelar as 2 ferramentas ociosas (economia ~R$ 190/mês).`,
  },
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */
export const kpis = [
  { label: "RECEITA · JUL", value: "R$ 18.240", delta: "▲ 12% vs jun", tone: "ok" as Tone },
  { label: "A RECEBER · 30D", value: "R$ 9.400", delta: "▲ 4% vs jun", tone: "ok" as Tone },
  { label: "LEADS ATIVOS", value: "7", delta: "▼ 2 esfriando", tone: "danger" as Tone },
  { label: "PROJETOS ATIVOS", value: "5", delta: "▲ 1 novo", tone: "ok" as Tone },
  { label: "MRR · ASAAS", value: "R$ 3.120", delta: "▲ 8% vs jun", tone: "ok" as Tone },
  { label: "HORAS · SEMANA", value: "31h", delta: "= média", tone: "mut" as Tone },
];

export const funil = [
  { name: "Contato", value: 12, width: 100, fill: "rgba(29,91,255,.25)" },
  { name: "Qualificado", value: 8, width: 66, fill: "rgba(29,91,255,.45)" },
  { name: "Proposta", value: 4, width: 33, fill: "rgba(29,91,255,.7)" },
  { name: "Fechado", value: 2, width: 17, fill: "#1D5BFF" },
];

export const projetosConcluidos: { mes: string; h: number; on?: boolean }[] = [
  { mes: "fev", h: 34 },
  { mes: "mar", h: 58 },
  { mes: "abr", h: 42 },
  { mes: "mai", h: 75 },
  { mes: "jun", h: 50 },
  { mes: "jul", h: 66, on: true },
];

type AtencaoAction =
  | { kind: "draft"; key: string; label: string; solid?: boolean }
  | { kind: "link"; href: string; label: string };
export type AtencaoItem = { valor: string; text: string; ia?: boolean; action: AtencaoAction };

export const atencao: AtencaoItem[] = [
  {
    valor: "R$ 4.200",
    text: "Fatura **#042 · Acme Co.** vence amanhã",
    action: { kind: "draft", key: "cobrancaAcme", label: "Cobrar", solid: true },
  },
  {
    valor: "US$ 3.500",
    text: "Proposta **Nordic AS** sem resposta há 5 dias",
    ia: true,
    action: { kind: "draft", key: "followupNordic", label: "Follow-up" },
  },
  {
    valor: "R$ 1.500",
    text: "Projeto **Landing X** com 78% de risco de atraso (entrega 11/07)",
    action: { kind: "link", href: "/projetos", label: "Ver projeto" },
  },
];

/* ------------------------------------------------------------------ */
/* CRM                                                                 */
/* ------------------------------------------------------------------ */
export type Contato = {
  empresa: string;
  pessoa: string;
  flag: string;
  pais: string;
  ramo: string;
  status: string;
  statusTone: Tone;
  score: number;
  scoreTone: Tone;
  ultima: string;
  proxima: string;
  draft: string;
};

export const contatos: Contato[] = [
  { empresa: "Acme Co.", pessoa: "João Prado · joao@acme.com.br", flag: "🇧🇷", pais: "BR", ramo: "E-commerce", status: "Cliente", statusTone: "ok", score: 87, scoreTone: "ok", ultima: "ontem", proxima: "Oferecer plano de manutenção mensal", draft: "upsellAcme" },
  { empresa: "Nordic AS", pessoa: "Ingrid Berg · ingrid@nordic.no", flag: "🇳🇴", pais: "NO", ramo: "SaaS", status: "Proposta", statusTone: "brand", score: 62, scoreTone: "amber", ultima: "5 dias", proxima: "Follow-up da proposta de US$ 3.500", draft: "followupNordic" },
  { empresa: "Bloom GmbH", pessoa: "Ana Weiss · ana@bloom.de", flag: "🇩🇪", pais: "DE", ramo: "Saúde", status: "Cliente", statusTone: "ok", score: 91, scoreTone: "ok", ultima: "hoje", proxima: "Agendar review trimestral (€ 4k em aberto)", draft: "reviewBloom" },
  { empresa: "Lex Advocacia", pessoa: "Dra. Camila Reis · camila@lex.adv.br", flag: "🇧🇷", pais: "BR", ramo: "Jurídico", status: "Lead frio", statusTone: "mut", score: 34, scoreTone: "danger", ultima: "12 dias", proxima: "Reengajar com o case do painel Bloom", draft: "reengajarLex" },
  { empresa: "Hudson Media", pessoa: "Mike Ross · mike@hudson.io", flag: "🇺🇸", pais: "US", ramo: "Mídia", status: "Negociação", statusTone: "brand", score: 78, scoreTone: "ok", ultima: "2 dias", proxima: "Enviar estimativa do retainer (US$ 1,2k/mês)", draft: "retainerHudson" },
  { empresa: "Vela Fitness", pessoa: "Paula Dias · paula@vela.fit", flag: "🇧🇷", pais: "BR", ramo: "Fitness", status: "Qualificado", statusTone: "brand", score: 55, scoreTone: "amber", ultima: "4 dias", proxima: "Convidar para call de descoberta", draft: "callVela" },
];

export const distribuicao = [
  { flag: "🇧🇷", pais: "BR", pct: 50, fill: "#1D5BFF" },
  { flag: "🇪🇺", pais: "EU", pct: 33, fill: "#00D1FF" },
  { flag: "🇺🇸", pais: "US", pct: 17, fill: "#0A1A33" },
];

/* ------------------------------------------------------------------ */
/* Projetos (Kanban)                                                   */
/* ------------------------------------------------------------------ */
export type KanbanCard = {
  id: string;
  title: string;
  valor: string;
  prazo: string;
  progress: number;
  etapa?: string;
  risk?: number;
  ia?: boolean;
  done?: boolean;
};

export type KanbanColumn = { id: string; name: string; cards: KanbanCard[] };

export const kanban: KanbanColumn[] = [
  { id: "briefing", name: "Briefing", cards: [{ id: "p1", title: "App Delivery", valor: "R$ 12.000", prazo: "20/08", progress: 0 }] },
  {
    id: "proposta",
    name: "Proposta",
    cards: [
      { id: "p2", title: "Site Nordic", valor: "US$ 3.500", prazo: "15/08", progress: 0, ia: true },
      { id: "p3", title: "Bot WhatsApp", valor: "R$ 6.000", prazo: "a definir", progress: 0 },
    ],
  },
  { id: "aprovado", name: "Aprovado", cards: [] },
  {
    id: "dev",
    name: "Em dev",
    cards: [
      { id: "p4", title: "Landing X", valor: "R$ 1.500", prazo: "11/07", progress: 45, risk: 78, etapa: "etapa até 09/07 · entrega 11/07" },
      { id: "p5", title: "Painel Bloom", valor: "€ 4.000", prazo: "30/07", progress: 70, etapa: "etapa até 18/07 · entrega 30/07" },
    ],
  },
  { id: "revisao", name: "Revisão", cards: [{ id: "p6", title: "Loja Acme", valor: "R$ 8.000", prazo: "14/07", progress: 90, etapa: "revisão até 12/07 · entrega 14/07" }] },
  { id: "entrega", name: "Entrega", cards: [] },
  { id: "concluido", name: "Concluído", cards: [{ id: "p7", title: "Blog Lex", valor: "R$ 2.100", prazo: "pago", progress: 100, done: true }] },
];

export const checklistLandingX: { texto: string; done: boolean; ia?: string }[] = [
  { texto: "Briefing aprovado", done: true, ia: "IA · e-mail 28/06" },
  { texto: "Wireframe enviado", done: true },
  { texto: "Ambiente de staging no ar", done: true, ia: "IA · deploy 04/07" },
  { texto: "Copy revisada pelo cliente", done: false },
  { texto: "Integração do formulário", done: false },
  { texto: "Deploy em produção", done: false },
];

export type Etapa = {
  nome: string;
  prazo: string;
  prazoTone?: Tone;
  status: string;
  statusTone: Tone;
  dur: string;
  durTone?: Tone;
  bold?: boolean;
};

export const etapasLandingX: Etapa[] = [
  { nome: "Briefing", prazo: "28/06", status: "✓ concluída", statusTone: "ok", dur: "2d · média 3d" },
  { nome: "Design", prazo: "02/07", status: "✓ concluída", statusTone: "ok", dur: "3d · média 4d" },
  { nome: "Desenvolvimento", prazo: "09/07", prazoTone: "amber", status: "● em andamento", statusTone: "brand", dur: "7d · média 5d ⚠", durTone: "danger", bold: true },
  { nome: "Revisão do cliente", prazo: "10/07", status: "pendente", statusTone: "mut", dur: "— · média 2d" },
  { nome: "Deploy", prazo: "11/07", status: "pendente", statusTone: "mut", dur: "— · média 1d" },
];

export const arquivosLandingX = [
  { icon: "📄", nome: "Contrato_LandingX.pdf", tipo: "Contrato" },
  { icon: "🧾", nome: "NF-041_entrada.pdf", tipo: "Nota fiscal" },
  { icon: "📝", nome: "Briefing-cliente.docx", tipo: "Documento" },
  { icon: "🖼", nome: "logos-e-fotos-cliente.zip", tipo: "Imagens" },
];

/* ------------------------------------------------------------------ */
/* Financeiro                                                          */
/* ------------------------------------------------------------------ */
export const lucroCliente: { nome: string; pct: number; valor: string; fill: string; danger?: boolean }[] = [
  { nome: "Bloom", pct: 82, valor: "R$ 14,2k", fill: "#1D5BFF" },
  { nome: "Acme", pct: 60, valor: "R$ 10,4k", fill: "#1D5BFF" },
  { nome: "Nordic", pct: 38, valor: "R$ 6,6k", fill: "#00D1FF" },
  { nome: "Hudson", pct: 22, valor: "R$ 3,8k", fill: "#00D1FF" },
  { nome: "Lex", pct: 6, valor: "R$ 0,9k", fill: "#E5484D", danger: true },
];

export type Receber = {
  empresa: string;
  sub: string;
  valor: string;
  venc: string;
  vencTone: Tone;
  risco: string;
  riscoTone: Tone;
  action?: { key: string; label: string; solid?: boolean };
};

export const contasReceber: Receber[] = [
  { empresa: "Acme Co.", sub: "fatura #042 · e-commerce", valor: "R$ 4.200", venc: "amanhã", vencTone: "amber", risco: "baixo · 8%", riscoTone: "ok", action: { key: "cobrancaAcme", label: "Enviar lembrete" } },
  { empresa: "Lex Advocacia", sub: "fatura #038 · jurídico", valor: "R$ 2.100", venc: "8 dias atrás", vencTone: "danger", risco: "alto · 72%", riscoTone: "danger", action: { key: "cobrancaLex", label: "Cobrança IA", solid: true } },
  { empresa: "Bloom GmbH", sub: "sprint 7 · saúde", valor: "€ 4.000", venc: "30/07", vencTone: "mut", risco: "baixo · 3%", riscoTone: "ok" },
];

type AsaasStat = { label: string; value: string; valueTone?: Tone; sub: string; subTone: Tone; ia?: boolean };
export const asaasStats: AsaasStat[] = [
  { label: "MRR", value: "R$ 3.120", sub: "▲ 8% vs jun", subTone: "ok" as Tone },
  { label: "ASSINATURAS ATIVAS", value: "6", sub: "manutenção + suporte", subTone: "mut" as Tone },
  { label: "RETRY DE CARTÃO", value: "1", valueTone: "amber" as Tone, sub: "Vela Fitness · 2ª tentativa amanhã", subTone: "mut" as Tone },
  { label: "CHURN PREVISTO", value: "1", valueTone: "danger" as Tone, sub: "Lex · 68% de chance em 60d", subTone: "mut" as Tone, ia: true },
];

/* ------------------------------------------------------------------ */
/* Assistente IA                                                       */
/* ------------------------------------------------------------------ */
export const chips = [
  { key: "cobrar", label: "Quem devo cobrar?" },
  { key: "faturamento", label: "Quanto faturei este mês?" },
  { key: "nordic", label: "Rascunhe follow-up p/ Nordic" },
  { key: "risco", label: "Como está o risco dos projetos?" },
];

export const replies: Record<string, { text: string; actions?: { label: string; draft?: string; href?: string }[] }> = {
  cobrar: {
    text: "Duas cobranças pendentes esta semana:\n\n• Acme Co. — R$ 4.200, vence amanhã (risco baixo)\n• Lex Advocacia — R$ 2.100, 8 dias em atraso (risco de inadimplência: 72%)",
    actions: [
      { label: "Rascunhar cobrança Acme", draft: "cobrancaAcme" },
      { label: "Rascunhar cobrança Lex", draft: "cobrancaLex" },
    ],
  },
  faturamento: {
    text: "Julho até agora: R$ 18.240 (+12% vs junho).\n\n• BR: R$ 12,1k · Exterior: R$ 9,2k equivalente\n• MRR Asaas: R$ 3.120\n• Projeção de fechamento do mês: R$ 21,5k",
    actions: [{ label: "Ver financeiro", href: "/financeiro" }],
  },
  nordic: {
    text: "Preparei um follow-up amigável para a Ingrid retomando a proposta de US$ 3.500, com sugestão de call na quinta.",
    actions: [{ label: "Abrir rascunho", draft: "followupNordic" }],
  },
  risco: {
    text: "Um projeto em risco: Landing X (78% de chance de atraso — entrega 11/07, progresso em 45%).\n\nSugestão: mover a revisão da Loja Acme para sexta e dedicar a quinta inteira à Landing X.",
    actions: [{ label: "Ver projetos", href: "/projetos" }],
  },
  fallback: {
    text: "Boa pergunta! Neste protótipo eu respondo melhor sobre cobranças, faturamento, a proposta da Nordic e risco de projetos — experimente um dos atalhos acima.",
  },
};

/* ------------------------------------------------------------------ */
/* Anotações                                                           */
/* ------------------------------------------------------------------ */
export type Nota = { id: number; text: string; tag?: string; dueOffset: number | null; detected?: boolean; done?: boolean };

export const notasSeed: Nota[] = [
  { id: 1, text: "Cobrar Maria do boleto atrasado", tag: "Financeiro", dueOffset: -1, detected: true },
  { id: 2, text: "Enviar orçamento para a Vela Fitness", tag: "CRM", dueOffset: 0, detected: true },
  { id: 3, text: "Renovar domínio inovalabs.com.br", tag: "Financeiro", dueOffset: 7, detected: true },
  { id: 4, text: "Ideia: template de proposta bilíngue PT/EN", tag: "Ideia", dueOffset: null },
  { id: 5, text: "Atualizar portfólio com o case Bloom", dueOffset: -3, done: true },
];
