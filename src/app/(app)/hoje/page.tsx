import { CentralHoje, type PrioTarefa } from "@/components/central-hoje";
import { formatMoney, relativeDate } from "@/lib/format";
import { montarRecomendacao, montarRadar, type RecebimentoCentral, type ClienteCentral } from "@/lib/central";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export default async function HojePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fimHoje = new Date(inicioHoje);
  fimHoje.setDate(fimHoje.getDate() + 1);
  const mesInicioIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  const [
    { data: perfil },
    { data: tarefas },
    { data: recebimentos },
    { data: eventos },
    { data: focoHoje },
    { data: clientes },
    { data: projetos },
    { data: metaRow },
  ] = await Promise.all([
    user
      ? supabase.from("usuarios").select("nome, meta_horas_dia").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("tarefas_dia").select("id, titulo, status, ordem").order("ordem"),
    supabase
      .from("recebimentos")
      .select("id, cliente_id, valor, valor_pago, moeda, status, vencimento, data_pagamento, clientes(nome)"),
    supabase
      .from("eventos_agenda")
      .select("quando, tipo_ev")
      .gte("quando", inicioHoje.toISOString())
      .lt("quando", fimHoje.toISOString())
      .order("quando"),
    supabase.from("sessoes_foco").select("duracao_seg").eq("tipo", "foco").gte("finalizada_em", inicioHoje.toISOString()),
    supabase.from("clientes").select("id, nome, status, ultima_interacao"),
    supabase.from("projetos").select("id, titulo, status, progresso, data_entrega").order("created_at"),
    user
      ? supabase.from("metas_financeiras").select("valor_meta").eq("user_id", user.id).eq("mes", mesInicioIso).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const primeiroNome = perfil?.nome?.trim().split(/\s+/)[0] || "você";
  const recs = (recebimentos ?? []) as RecebimentoCentral[];
  const clis = (clientes ?? []) as ClienteCentral[];
  const projs = projetos ?? [];

  // A RECEBER — próxima conta em aberto (menor prazo de vencimento primeiro)
  const abertas = recs
    .map((r) => ({ ...r, saldo: Math.max(0, Number(r.valor) - Number(r.valor_pago)) }))
    .filter((r) => r.saldo > 0)
    .sort((a, b) => {
      if (!a.vencimento && !b.vencimento) return b.saldo - a.saldo;
      if (!a.vencimento) return 1;
      if (!b.vencimento) return -1;
      return a.vencimento.localeCompare(b.vencimento);
    });
  const prox = abertas[0];
  const aReceber = prox
    ? {
        valor: formatMoney(prox.saldo, prox.moeda as Enums<"moeda">),
        sub: `${prox.clientes?.nome ?? "Sem cliente"}${prox.vencimento ? ` · ${relativeDate(prox.vencimento)}` : ""}`,
      }
    : { valor: formatMoney(0), sub: "nada pendente 🎉" };

  // REUNIÕES de hoje
  const reunioesHoje = (eventos ?? []).filter((e) => e.tipo_ev === "reuniao");
  const horario = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  };
  const reunioes = {
    total: reunioesHoje.length,
    sub:
      reunioesHoje.length === 0
        ? "sem reuniões hoje"
        : reunioesHoje
            .slice(0, 2)
            .map((e) => horario(e.quando))
            .join(" e ") + (reunioesHoje.length > 2 ? ` +${reunioesHoje.length - 2}` : ""),
  };

  // META DE HORAS — foco de hoje vs meta diária
  const focoSeg = (focoHoje ?? []).reduce((s, r) => s + Number(r.duracao_seg), 0);
  const metaHorasDia = Number(perfil?.meta_horas_dia ?? 6);

  // Meta do mês (pro radar) — recebido no mês vs meta
  const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const proxMesIso = `${proxMes.getFullYear()}-${String(proxMes.getMonth() + 1).padStart(2, "0")}-01`;
  const recebidoMes = recs
    .filter((r) => r.moeda === "BRL" && r.data_pagamento && r.data_pagamento >= mesInicioIso && r.data_pagamento < proxMesIso)
    .reduce((s, r) => s + Number(r.valor_pago), 0);
  const meta = metaRow ? { valorMeta: Number(metaRow.valor_meta), recebidoMes } : null;

  const recomendacao = montarRecomendacao(recs, clis, projs);
  const radar = montarRadar(recs, clis, projs, meta);

  const dataHoje = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(hoje);

  return (
    <CentralHoje
      nome={primeiroNome}
      dataHoje={dataHoje}
      metaHorasDia={metaHorasDia}
      focoHojeSegInicial={focoSeg}
      tarefasInicial={(tarefas ?? []) as PrioTarefa[]}
      aReceber={aReceber}
      reunioes={reunioes}
      recomendacao={recomendacao}
      radar={radar}
      projetosAtivos={projs.filter((p) => p.status !== "concluido").map((p) => ({ id: p.id, titulo: p.titulo }))}
    />
  );
}
