import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { formatMoney, relativeDate, relativeInteraction } from "@/lib/format";

type DB = SupabaseClient<Database>;

/**
 * Tools do Assistente — cada uma consulta o Postgres via o client autenticado
 * da requisição (RLS já restringe tudo a auth.uid()). Somente leitura.
 */
export const assistantTools: Anthropic.Tool[] = [
  {
    name: "buscar_clientes",
    description:
      "Busca contatos do CRM (clientes e leads). Use para responder perguntas sobre clientes específicos, status, score, ramo ou próxima ação sugerida.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Filtra pelo nome do cliente (busca parcial, opcional)" },
      },
    },
  },
  {
    name: "buscar_projetos",
    description:
      "Busca projetos (kanban). Use para responder sobre prazos, progresso, risco de atraso ou status de projetos.",
    input_schema: {
      type: "object",
      properties: {
        apenas_em_risco: {
          type: "boolean",
          description: "Se true, retorna só projetos com risco de atraso definido",
        },
      },
    },
  },
  {
    name: "buscar_financeiro",
    description:
      "Busca contas a receber pendentes (com valor pago e saldo em aberto), resumo das assinaturas recorrentes (MRR, retry de cartão, churn previsto) e despesas do negócio (total + recentes). Use para perguntas sobre cobrança, faturamento, despesas, lucro ou receita recorrente.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "buscar_anotacoes",
    description: "Busca anotações/lembretes do usuário, com prazo e status de conclusão.",
    input_schema: {
      type: "object",
      properties: {
        apenas_pendentes: { type: "boolean", description: "Se true, oculta anotações já concluídas" },
      },
    },
  },
];

export async function executeTool(
  supabase: DB,
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "buscar_clientes": {
      let query = supabase
        .from("clientes")
        .select("nome, contato_nome, pais, ramo, status, score_ia, proxima_acao_ia, ultima_interacao")
        .order("score_ia", { ascending: false, nullsFirst: false });
      if (typeof input.nome === "string" && input.nome.trim()) {
        query = query.ilike("nome", `%${input.nome.trim()}%`);
      }
      const { data, error } = await query;
      if (error) return { erro: error.message };
      return data.map((c) => ({ ...c, ultima_interacao: relativeInteraction(c.ultima_interacao) }));
    }

    case "buscar_projetos": {
      let query = supabase
        .from("projetos")
        .select("titulo, status, valor, moeda, progresso, risco_atraso, data_entrega, clientes(nome)");
      if (input.apenas_em_risco) {
        query = query.not("risco_atraso", "is", null);
      }
      const { data, error } = await query;
      if (error) return { erro: error.message };
      return data.map((p) => ({
        titulo: p.titulo,
        cliente: p.clientes?.nome ?? null,
        status: p.status,
        valor: p.valor != null ? formatMoney(Number(p.valor), p.moeda) : null,
        progresso: p.progresso,
        risco_atraso_pct: p.risco_atraso,
        entrega: relativeDate(p.data_entrega),
      }));
    }

    case "buscar_financeiro": {
      const [{ data: recebimentos, error: e1 }, { data: assinaturas, error: e2 }, { data: custos, error: e3 }] =
        await Promise.all([
          supabase
            .from("recebimentos")
            .select("valor, valor_pago, moeda, data_pagamento, status, clientes(nome), projetos(titulo)")
            .neq("status", "pago")
            .order("data_pagamento", { nullsFirst: false }),
          supabase.from("assinaturas").select("valor, status, churn_score, clientes(nome)"),
          supabase.from("custos").select("descricao, categoria, valor, data, recorrente").order("data", { ascending: false }).limit(30),
        ]);
      if (e1 || e2 || e3) return { erro: (e1 ?? e2 ?? e3)?.message };
      const mrr = (assinaturas ?? [])
        .filter((a) => a.status === "ativa")
        .reduce((sum, a) => sum + Number(a.valor), 0);
      const totalDespesas = (custos ?? []).reduce((sum, c) => sum + Number(c.valor), 0);
      return {
        contas_a_receber: (recebimentos ?? []).map((r) => ({
          cliente: r.clientes?.nome ?? null,
          projeto: r.projetos?.titulo ?? null,
          valor_servico: formatMoney(Number(r.valor), r.moeda),
          valor_pago: formatMoney(Number(r.valor_pago), r.moeda),
          saldo_em_aberto: formatMoney(Math.max(0, Number(r.valor) - Number(r.valor_pago)), r.moeda),
          ultimo_pagamento: relativeDate(r.data_pagamento),
          status: r.status,
        })),
        mrr_ativo: formatMoney(mrr),
        assinaturas_com_problema: (assinaturas ?? [])
          .filter((a) => a.status !== "ativa")
          .map((a) => ({ cliente: a.clientes?.nome ?? null, status: a.status, churn_score: a.churn_score })),
        despesas_total: formatMoney(totalDespesas),
        despesas_recentes: (custos ?? []).slice(0, 10).map((c) => ({
          descricao: c.descricao,
          categoria: c.categoria,
          valor: formatMoney(Number(c.valor)),
          data: relativeDate(c.data),
          recorrente: c.recorrente,
        })),
      };
    }

    case "buscar_anotacoes": {
      let query = supabase.from("anotacoes").select("texto, tag, due, concluida").order("due");
      if (input.apenas_pendentes) query = query.eq("concluida", false);
      const { data, error } = await query;
      if (error) return { erro: error.message };
      return data;
    }

    default:
      return { erro: `Tool desconhecida: ${name}` };
  }
}
