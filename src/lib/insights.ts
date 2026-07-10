// Cálculos de insights (Fase 3) — determinísticos, a partir de dados reais.
// Todos os valores monetários agregados aqui são em BRL (moeda base da visão).

export type RecebimentoLike = {
  cliente_id: string | null;
  valor: number | string;
  valor_pago: number | string;
  moeda: string;
  status: string;
  vencimento: string | null;
  data_pagamento: string | null;
};

export type CustoLike = { cliente_id: string | null; valor: number | string };
export type AssinaturaLike = { valor: number | string; status: string };
export type ProjetoLike = {
  id: string;
  titulo: string;
  status: string;
  progresso: number;
  data_entrega: string | null;
};
export type ClienteLike = { id: string; nome: string };

const n = (v: number | string) => Number(v) || 0;
const hojeIso = () => new Date().toISOString().slice(0, 10);
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86_400_000);

/* ------------------------------------------------------------------ */
/* Previsão de receita — 90 dias, 3 cenários                          */
/* ------------------------------------------------------------------ */
export function previsaoReceita(recebimentos: RecebimentoLike[], assinaturas: AssinaturaLike[]) {
  const brl = recebimentos.filter((r) => r.moeda === "BRL");
  const mrr = assinaturas.filter((a) => a.status === "ativa").reduce((s, a) => s + n(a.valor), 0);

  // saldo em aberto de vendas ainda não quitadas
  const saldoAberto = brl
    .filter((r) => r.status !== "pago")
    .reduce((s, r) => s + Math.max(0, n(r.valor) - n(r.valor_pago)), 0);

  // média mensal recebida nos últimos 3 meses (histórico de pagamentos)
  const hoje = new Date();
  const ini3m = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1).toISOString().slice(0, 10);
  const recebido3m = brl
    .filter((r) => r.data_pagamento && r.data_pagamento >= ini3m)
    .reduce((s, r) => s + n(r.valor_pago), 0);
  const mediaMensal = recebido3m / 3;

  const recorrente90 = mrr * 3;
  // base: recorrente + cobrança de 85% do saldo + tendência (média mensal já observada) por 3 meses
  const base = recorrente90 + saldoAberto * 0.85 + mediaMensal * 3 * 0.6;
  const otimista = recorrente90 * 1.05 + saldoAberto * 1.0 + mediaMensal * 3 * 1.0;
  const pessimista = recorrente90 * 0.8 + saldoAberto * 0.5 + mediaMensal * 3 * 0.3;

  return {
    mrr,
    saldoAberto,
    mediaMensal,
    base: Math.round(base),
    otimista: Math.round(otimista),
    pessimista: Math.round(pessimista),
  };
}

/* ------------------------------------------------------------------ */
/* Lucro por cliente — recebido - custos alocados                     */
/* ------------------------------------------------------------------ */
export type LucroCliente = {
  clienteId: string;
  nome: string;
  recebido: number;
  custos: number;
  lucro: number;
  margem: number; // %
};

export function lucroPorCliente(
  clientes: ClienteLike[],
  recebimentos: RecebimentoLike[],
  custos: CustoLike[],
): LucroCliente[] {
  const rec = new Map<string, number>();
  for (const r of recebimentos) {
    if (r.moeda !== "BRL" || !r.cliente_id) continue;
    rec.set(r.cliente_id, (rec.get(r.cliente_id) ?? 0) + n(r.valor_pago));
  }
  const cus = new Map<string, number>();
  for (const c of custos) {
    if (!c.cliente_id) continue;
    cus.set(c.cliente_id, (cus.get(c.cliente_id) ?? 0) + n(c.valor));
  }

  return clientes
    .map((c) => {
      const recebido = rec.get(c.id) ?? 0;
      const custosC = cus.get(c.id) ?? 0;
      const lucro = recebido - custosC;
      const margem = recebido > 0 ? Math.round((lucro / recebido) * 100) : 0;
      return { clienteId: c.id, nome: c.nome, recebido, custos: custosC, lucro, margem };
    })
    .filter((l) => l.recebido > 0 || l.custos > 0)
    .sort((a, b) => b.lucro - a.lucro);
}

/* ------------------------------------------------------------------ */
/* Risco de atraso dos projetos                                       */
/* ------------------------------------------------------------------ */
export type ProjetoRisco = { id: string; titulo: string; risco: number; motivo: string; entrega: string | null };

export function projetosEmRisco(projetos: ProjetoLike[]): ProjetoRisco[] {
  const hoje = hojeIso();
  return projetos
    .filter((p) => p.status !== "concluido")
    .map((p) => {
      const progresso = Number(p.progresso) || 0;
      if (!p.data_entrega) {
        // sem prazo definido: risco moderado só se progresso muito baixo
        const risco = progresso < 20 ? 35 : 15;
        return { id: p.id, titulo: p.titulo, risco, motivo: "sem prazo definido", entrega: null };
      }
      const dias = diasEntre(p.data_entrega, hoje);
      let risco: number;
      let motivo: string;
      if (dias < 0 && progresso < 100) {
        risco = Math.min(100, 80 + Math.abs(dias) * 2);
        motivo = `entrega passou há ${Math.abs(dias)} dia(s), ${progresso}% concluído`;
      } else {
        // progresso esperado ~ proporcional ao tempo; folga de dias reduz risco
        const faltaProgresso = 100 - progresso;
        risco = Math.max(0, Math.min(100, Math.round(faltaProgresso - dias * 3)));
        motivo =
          risco >= 50
            ? `faltam ${dias} dia(s) e ${faltaProgresso}% do trabalho`
            : `no prazo (${dias} dia(s), ${progresso}% feito)`;
      }
      return { id: p.id, titulo: p.titulo, risco, motivo, entrega: p.data_entrega };
    })
    .sort((a, b) => b.risco - a.risco);
}

/* ------------------------------------------------------------------ */
/* Risco de inadimplência das contas a receber                        */
/* ------------------------------------------------------------------ */
export type ContaRisco = {
  clienteNome: string;
  saldo: number;
  moeda: string;
  risco: number;
  diasAtraso: number;
};

export function inadimplencia(
  recebimentos: (RecebimentoLike & { clientes?: { nome: string } | null })[],
): ContaRisco[] {
  const hoje = hojeIso();
  return recebimentos
    .map((r) => {
      const saldo = Math.max(0, n(r.valor) - n(r.valor_pago));
      if (saldo <= 0) return null;
      let risco = 25; // pendente por si só
      let diasAtraso = 0;
      if (r.vencimento) {
        diasAtraso = -diasEntre(r.vencimento, hoje); // positivo = vencido
        if (diasAtraso > 0) risco = Math.min(100, 45 + diasAtraso * 3);
      }
      if (r.status === "atrasado") risco = Math.max(risco, 70);
      return {
        clienteNome: r.clientes?.nome ?? "Sem cliente",
        saldo,
        moeda: r.moeda,
        risco,
        diasAtraso,
      };
    })
    .filter((x): x is ContaRisco => x !== null)
    .sort((a, b) => b.risco - a.risco);
}

/* ------------------------------------------------------------------ */
/* Lead scoring — 0..100 a partir de sinais reais                     */
/* ------------------------------------------------------------------ */
export type ClienteScoreInput = {
  id: string;
  nome: string;
  status: string;
  valor_potencial: number | string | null;
  ultima_interacao: string | null;
  temProjetoAtivo: boolean;
  recebidoTotal: number;
};

const STATUS_BASE: Record<string, number> = {
  recorrente: 82,
  cliente: 74,
  negociacao: 60,
  proposta: 52,
  qualificado: 42,
  lead: 30,
  frio: 15,
  perdido: 3,
};

export function leadScore(c: ClienteScoreInput): number {
  let score = STATUS_BASE[c.status] ?? 30;

  // recência da última interação
  if (c.ultima_interacao) {
    const dias = -diasEntre(c.ultima_interacao.slice(0, 10), hojeIso());
    if (dias <= 3) score += 8;
    else if (dias <= 10) score += 3;
    else if (dias > 30) score -= 8;
    else if (dias > 14) score -= 4;
  } else {
    score -= 5;
  }

  if (c.temProjetoAtivo) score += 8;
  if (c.recebidoTotal > 0) score += 6; // já pagou algo = confiável
  const vp = Number(c.valor_potencial) || 0;
  if (vp >= 5000) score += 6;
  else if (vp >= 2000) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function proximaAcao(c: ClienteScoreInput, saldoEmAberto: number): string {
  if (saldoEmAberto > 0) return "Cobrar saldo em aberto e confirmar pagamento";
  switch (c.status) {
    case "lead":
      return "Qualificar: entender necessidade e orçamento";
    case "qualificado":
      return "Enviar proposta ou agendar call de descoberta";
    case "proposta":
      return "Follow-up da proposta enviada";
    case "negociacao":
      return "Fechar negociação — alinhar escopo e valor";
    case "cliente":
      return c.temProjetoAtivo ? "Acompanhar entrega do projeto ativo" : "Oferecer novo projeto ou manutenção";
    case "recorrente":
      return "Manter relacionamento — revisão periódica";
    case "frio":
      return "Reengajar com um case ou novidade relevante";
    case "perdido":
      return "Arquivar ou tentar reativar em 90 dias";
    default:
      return "Definir próximo passo";
  }
}
