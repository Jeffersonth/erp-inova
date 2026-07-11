// Central de Trabalho ("Hoje") — recomendação principal e radar do dia.
// Regras determinísticas sobre dados reais, reaproveitando o shape de insights.ts.

import { projetosEmRisco, type ProjetoLike } from "@/lib/insights";
import { formatMoney } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

export type RecebimentoCentral = {
  id: string;
  cliente_id: string | null;
  valor: number | string;
  valor_pago: number | string;
  moeda: string;
  status: string;
  vencimento: string | null;
  data_pagamento?: string | null;
  clientes: { nome: string } | null;
};

export type ClienteCentral = {
  id: string;
  nome: string;
  status: string;
  ultima_interacao: string | null;
};

export type Recomendacao = {
  texto: string; // markdown leve (**bold**) — renderizado com RichText
  acao:
    | { tipo: "draft"; draft: "cobranca" | "mensagem_cliente"; clienteId: string; recebimentoId?: string; label: string }
    | { tipo: "link"; href: string; label: string }
    | null;
};

export type RadarItem = { cor: "danger" | "warn" | "ok"; texto: string };

const n = (v: number | string) => Number(v) || 0;
const hojeIso = () => new Date().toISOString().slice(0, 10);
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86_400_000);

const leadsAtivos = ["lead", "qualificado", "proposta", "negociacao"];

type ContaAberta = {
  recebimentoId: string;
  clienteId: string | null;
  clienteNome: string;
  saldo: number;
  moeda: string;
  diasAtraso: number; // positivo = vencida
  venceEm: number | null; // dias até vencer (0 = hoje, 1 = amanhã)
};

function contasAbertas(recebimentos: RecebimentoCentral[]): ContaAberta[] {
  const hoje = hojeIso();
  return recebimentos
    .map((r) => {
      const saldo = Math.max(0, n(r.valor) - n(r.valor_pago));
      if (saldo <= 0) return null;
      let diasAtraso = 0;
      let venceEm: number | null = null;
      if (r.vencimento) {
        const d = diasEntre(r.vencimento, hoje);
        if (d < 0) diasAtraso = -d;
        else venceEm = d;
      }
      return {
        recebimentoId: r.id,
        clienteId: r.cliente_id,
        clienteNome: r.clientes?.nome ?? "Sem cliente",
        saldo,
        moeda: r.moeda,
        diasAtraso,
        venceEm,
      };
    })
    .filter((x): x is ContaAberta => x !== null);
}

function leadsFrios(clientes: ClienteCentral[]) {
  const hoje = hojeIso();
  return clientes
    .filter((c) => leadsAtivos.includes(c.status))
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      dias: c.ultima_interacao ? -diasEntre(c.ultima_interacao.slice(0, 10), hoje) : 999,
    }))
    .filter((c) => c.dias >= 10)
    .sort((a, b) => b.dias - a.dias);
}

/** A recomendação principal do dia — 1 ação, priorizada por impacto. */
export function montarRecomendacao(
  recebimentos: RecebimentoCentral[],
  clientes: ClienteCentral[],
  projetos: ProjetoLike[],
): Recomendacao {
  const contas = contasAbertas(recebimentos);

  // 1) conta vencida (maior atraso × valor primeiro)
  const vencida = contas
    .filter((c) => c.diasAtraso > 0 && c.clienteId)
    .sort((a, b) => b.diasAtraso * b.saldo - a.diasAtraso * a.saldo)[0];
  if (vencida?.clienteId) {
    return {
      texto: `O pagamento da **${vencida.clienteNome}** está vencido há ${vencida.diasAtraso} dia(s) — ${formatMoney(vencida.saldo, vencida.moeda as Enums<"moeda">)} em aberto. Bom momento para cobrar.`,
      acao: { tipo: "draft", draft: "cobranca", clienteId: vencida.clienteId, recebimentoId: vencida.recebimentoId, label: "Rascunhar cobrança" },
    };
  }

  // 2) conta vencendo hoje/amanhã
  const vencendo = contas
    .filter((c) => c.venceEm !== null && c.venceEm <= 1 && c.clienteId)
    .sort((a, b) => b.saldo - a.saldo)[0];
  if (vencendo?.clienteId) {
    const quando = vencendo.venceEm === 0 ? "hoje" : "amanhã";
    return {
      texto: `A fatura da **${vencendo.clienteNome}** (${formatMoney(vencendo.saldo, vencendo.moeda as Enums<"moeda">)}) vence ${quando}. Um lembrete amigável evita o atraso.`,
      acao: { tipo: "draft", draft: "cobranca", clienteId: vencendo.clienteId, recebimentoId: vencendo.recebimentoId, label: "Rascunhar lembrete" },
    };
  }

  // 3) lead esfriando
  const frios = leadsFrios(clientes);
  if (frios[0]) {
    const l = frios[0];
    const tempo = l.dias >= 999 ? "sem nenhum contato registrado" : `sem contato há ${l.dias} dias`;
    return {
      texto: `O lead **${l.nome}** está ${tempo}. Uma mensagem agora pode reaquecer a conversa.`,
      acao: { tipo: "draft", draft: "mensagem_cliente", clienteId: l.id, label: "Rascunhar mensagem" },
    };
  }

  // 4) projeto com risco alto de atraso
  const risco = projetosEmRisco(projetos).find((p) => p.risco >= 50);
  if (risco) {
    return {
      texto: `O projeto **${risco.titulo}** está com ${risco.risco}% de risco de atraso (${risco.motivo}). Vale priorizar hoje.`,
      acao: { tipo: "link", href: `/projetos?p=${risco.id}`, label: "Ver projeto" },
    };
  }

  return {
    texto: "Tudo em dia por aqui — nenhuma cobrança, lead esfriando ou projeto em risco. Aproveite para avançar no que importa.",
    acao: null,
  };
}

/** Radar — tudo que merece atenção, em até 5 itens com cor de severidade. */
export function montarRadar(
  recebimentos: RecebimentoCentral[],
  clientes: ClienteCentral[],
  projetos: ProjetoLike[],
  meta: { valorMeta: number; recebidoMes: number } | null,
): RadarItem[] {
  const itens: { peso: number; item: RadarItem }[] = [];
  const contas = contasAbertas(recebimentos);

  for (const c of contas.filter((x) => x.diasAtraso > 0).slice(0, 2)) {
    itens.push({
      peso: 100 + c.diasAtraso,
      item: { cor: "danger", texto: `Pagamento da **${c.clienteNome}** vencido há ${c.diasAtraso} dia(s)` },
    });
  }
  for (const c of contas.filter((x) => x.venceEm !== null && x.venceEm <= 1).slice(0, 2)) {
    itens.push({
      peso: 80,
      item: {
        cor: "warn",
        texto: `Fatura da **${c.clienteNome}** (${formatMoney(c.saldo, c.moeda as Enums<"moeda">)}) vence ${c.venceEm === 0 ? "hoje" : "amanhã"}`,
      },
    });
  }
  for (const p of projetosEmRisco(projetos).filter((x) => x.risco >= 50).slice(0, 2)) {
    itens.push({
      peso: p.risco,
      item: { cor: p.risco >= 70 ? "danger" : "warn", texto: `**${p.titulo}** atrasado — ${p.risco}% de risco` },
    });
  }
  const frio = leadsFrios(clientes)[0];
  if (frio) {
    itens.push({
      peso: 45,
      item: {
        cor: "warn",
        texto: frio.dias >= 999 ? `Lead **${frio.nome}** sem nenhum contato registrado` : `Lead **${frio.nome}** esfriando — ${frio.dias} dias sem contato`,
      },
    });
  }
  if (meta && meta.valorMeta > 0) {
    const pct = Math.min(999, Math.round((meta.recebidoMes / meta.valorMeta) * 100));
    itens.push({
      peso: 20,
      item: {
        cor: pct >= 100 ? "ok" : pct >= 70 ? "ok" : "warn",
        texto:
          pct >= 100
            ? `Meta do mês **batida** — ${pct}% 🎉`
            : `Meta do mês em **${pct}%** — ${formatMoney(Math.max(0, meta.valorMeta - meta.recebidoMes))} restantes`,
      },
    });
  }

  return itens
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 5)
    .map((x) => x.item);
}
