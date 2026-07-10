import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leadScore, proximaAcao, type ClienteScoreInput } from "@/lib/insights";

// Recalcula score_ia + proxima_acao_ia de todos os clientes do usuário,
// a partir de sinais reais (status, projetos, pagamentos, recência, potencial).
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [{ data: clientes }, { data: projetos }, { data: recebimentos }] = await Promise.all([
    supabase.from("clientes").select("id, nome, status, valor_potencial, ultima_interacao"),
    supabase.from("projetos").select("cliente_id, status"),
    supabase.from("recebimentos").select("cliente_id, valor, valor_pago, moeda, status"),
  ]);

  if (!clientes) return NextResponse.json({ error: "Sem clientes" }, { status: 200 });

  const projAtivoPorCliente = new Set(
    (projetos ?? []).filter((p) => p.status !== "concluido" && p.cliente_id).map((p) => p.cliente_id as string),
  );
  const recebidoPorCliente = new Map<string, number>();
  const saldoPorCliente = new Map<string, number>();
  for (const r of recebimentos ?? []) {
    if (!r.cliente_id || r.moeda !== "BRL") continue;
    recebidoPorCliente.set(r.cliente_id, (recebidoPorCliente.get(r.cliente_id) ?? 0) + Number(r.valor_pago));
    if (r.status !== "pago") {
      const saldo = Math.max(0, Number(r.valor) - Number(r.valor_pago));
      saldoPorCliente.set(r.cliente_id, (saldoPorCliente.get(r.cliente_id) ?? 0) + saldo);
    }
  }

  let atualizados = 0;
  await Promise.all(
    clientes.map((c) => {
      const input: ClienteScoreInput = {
        id: c.id,
        nome: c.nome,
        status: c.status,
        valor_potencial: c.valor_potencial,
        ultima_interacao: c.ultima_interacao,
        temProjetoAtivo: projAtivoPorCliente.has(c.id),
        recebidoTotal: recebidoPorCliente.get(c.id) ?? 0,
      };
      const score = leadScore(input);
      const acao = proximaAcao(input, saldoPorCliente.get(c.id) ?? 0);
      atualizados++;
      return supabase.from("clientes").update({ score_ia: score, proxima_acao_ia: acao }).eq("id", c.id);
    }),
  );

  return NextResponse.json({ ok: true, atualizados });
}
