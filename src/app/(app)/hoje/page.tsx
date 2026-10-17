import { CentralHoje, type PrioTarefa } from "@/components/central-hoje";
import { formatMoney, relativeDate } from "@/lib/format";
import { montarRecomendacao, montarRadar, type RecebimentoCentral, type ClienteCentral } from "@/lib/central";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import { agendaDate, agendaNoPeriodo, montarAgenda, type AgendaEvent, type AgendaRecebimento } from "@/lib/agenda-items";

export default async function HojePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoje = new Date();
  const hojeIso = agendaDate(hoje);
  const inicioHoje = new Date(`${hojeIso}T00:00:00-03:00`);
  const fimHoje = new Date(inicioHoje.getTime() + 86_400_000);
  const mesInicioIso = `${hojeIso.slice(0, 7)}-01`;

  const [
    { data: perfil },
    { data: tarefas },
    { data: recebimentos, error: erroRecebimentos },
    { data: eventos, error: erroEventos },
    { data: focoHoje },
    { data: clientes },
    { data: projetos },
    { data: metaRow },
  ] = await Promise.all([
    user
      ? supabase.from("usuarios").select("nome, meta_horas_dia").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("tarefas_dia").select("id, titulo, status, ordem, data_finalizar").order("ordem"),
    supabase
      .from("recebimentos")
      .select("id, cliente_id, descricao, valor, valor_pago, moeda, status, vencimento, data_pagamento, clientes(nome)"),
    supabase
      .from("eventos_agenda")
      .select("id, titulo, tipo_ev, quando, fim, dia_inteiro, local, notas, projeto_id, valor, moeda, pago")
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
  const itensHoje = agendaNoPeriodo(montarAgenda(
    (eventos ?? []) as AgendaEvent[],
    (tarefas ?? []).filter(t => t.status !== "concluida" && t.data_finalizar).map(t => ({ id: t.id, titulo: t.titulo, data_finalizar: t.data_finalizar! })),
    (recebimentos ?? []) as AgendaRecebimento[],
  ), hojeIso, hojeIso);
  const reunioesHoje = itensHoje.filter(e => e.tipo === "reuniao");
  const reunioes = {
    total: reunioesHoje.length,
    sub:
      reunioesHoje.length === 0
        ? "sem reuniões hoje"
        : reunioesHoje
            .slice(0, 2)
            .map((e) => e.horario)
            .join(" e ") + (reunioesHoje.length > 2 ? ` +${reunioesHoje.length - 2}` : ""),
  };

  // META DE HORAS — foco de hoje vs meta diária
  const focoSeg = (focoHoje ?? []).reduce((s, r) => s + Number(r.duracao_seg), 0);
  const metaHorasDia = Number(perfil?.meta_horas_dia ?? 6);

  // Meta do mês (pro radar) — recebido no mês vs meta
  const proxMes = new Date(Date.UTC(Number(hojeIso.slice(0, 4)), Number(hojeIso.slice(5, 7)), 1));
  const proxMesIso = proxMes.toISOString().slice(0, 10);
  const recebidoMes = recs
    .filter((r) => r.moeda === "BRL" && r.data_pagamento && r.data_pagamento >= mesInicioIso && r.data_pagamento < proxMesIso)
    .reduce((s, r) => s + Number(r.valor_pago), 0);
  const meta = metaRow ? { valorMeta: Number(metaRow.valor_meta), recebidoMes } : null;

  const recomendacao = montarRecomendacao(recs, clis, projs);
  const radar = montarRadar(recs, clis, projs, meta);

  const dataHoje = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", weekday: "long", day: "numeric", month: "long" }).format(hoje);

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
      agendaHoje={itensHoje}
      agendaErro={Boolean(erroRecebimentos || erroEventos)}
      projetosAtivos={projs.filter((p) => p.status !== "concluido").map((p) => ({ id: p.id, titulo: p.titulo }))}
    />
  );
}
