import { Suspense } from "react";
import Link from "next/link";
import { IaBadge } from "@/components/ia-badge";
import { RichText } from "@/components/rich-text";
import { MetaMesCard } from "@/components/meta-mes-card";
import { toneText } from "@/lib/tone";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { gerarResumoDia } from "@/lib/ai/resumo";
import { projetosEmRisco, inadimplencia } from "@/lib/insights";
import type { Enums } from "@/lib/supabase/database.types";

const card = "rounded-xl border border-line bg-card";
const leadsAtivosStatus = ["lead", "qualificado", "proposta", "negociacao"] as const;

// Resumo do dia (IA) — isolado num boundary de Suspense para NÃO bloquear
// a renderização dos KPIs enquanto a IA responde.
async function ResumoDia(props: {
  projetosAtivos: number;
  leadsAtivos: number;
  aReceber: string;
  mrr: string;
  nome?: string;
}) {
  const resumo = await gerarResumoDia(props);
  return <RichText text={resumo} />;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const hoje = new Date();
  const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const mesInicioIso = `${mesInicio.getFullYear()}-${String(mesInicio.getMonth() + 1).padStart(2, "0")}-01`;
  const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const proxMesIso = `${proxMes.getFullYear()}-${String(proxMes.getMonth() + 1).padStart(2, "0")}-01`;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: projetos },
    { data: clientes },
    { data: assinaturas },
    { data: recebimentos },
    { data: perfil },
    { data: metaRow },
  ] = await Promise.all([
    supabase.from("projetos").select("id, titulo, status, progresso, data_entrega"),
    supabase.from("clientes").select("nome, status, ultima_interacao"),
    supabase.from("assinaturas").select("valor, status"),
    supabase
      .from("recebimentos")
      .select("cliente_id, valor, valor_pago, moeda, status, vencimento, data_pagamento, clientes(nome)")
      .eq("moeda", "BRL"),
    user ? supabase.from("usuarios").select("nome").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user
      ? supabase.from("metas_financeiras").select("valor_meta").eq("user_id", user.id).eq("mes", mesInicioIso).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const primeiroNome = perfil?.nome?.trim().split(/\s+/)[0] || undefined;

  const projetosAtivos = (projetos ?? []).filter((p) => p.status !== "concluido").length;
  const leadsAtivos = (clientes ?? []).filter((c) =>
    (leadsAtivosStatus as readonly string[]).includes(c.status),
  ).length;
  const mrr = (assinaturas ?? [])
    .filter((a) => a.status === "ativa")
    .reduce((sum, a) => sum + Number(a.valor), 0);

  const recs = recebimentos ?? [];
  const vendasTotais = recs.reduce((s, r) => s + Number(r.valor), 0);
  const recebido = recs.reduce((s, r) => s + Number(r.valor_pago), 0);
  const pendente = recs.reduce((s, r) => s + Math.max(0, Number(r.valor) - Number(r.valor_pago)), 0);
  const recebidoMes = recs
    .filter((r) => r.data_pagamento && r.data_pagamento >= mesInicioIso && r.data_pagamento < proxMesIso)
    .reduce((s, r) => s + Number(r.valor_pago), 0);
  const meta = metaRow ? Number(metaRow.valor_meta) : 0;

  // Atenção necessária — priorizada por impacto (dados reais)
  type Alerta = { valor: string; texto: string; tone: "danger" | "amber" | "brand"; href: string; label: string; peso: number };
  const alertas: Alerta[] = [];

  for (const c of inadimplencia(recs).slice(0, 4)) {
    if (c.risco < 35) continue;
    alertas.push({
      valor: formatMoney(c.saldo, c.moeda as Enums<"moeda">),
      texto: `**${c.clienteNome}** com saldo em aberto${c.diasAtraso > 0 ? ` (${c.diasAtraso} dia(s) em atraso)` : ""}`,
      tone: c.risco >= 60 ? "danger" : "amber",
      href: "/financeiro",
      label: "Cobrar",
      peso: c.risco,
    });
  }
  for (const p of projetosEmRisco(projetos ?? []).slice(0, 3)) {
    if (p.risco < 50) continue;
    alertas.push({
      valor: `${p.risco}%`,
      texto: `Projeto **${p.titulo}** com risco de atraso`,
      tone: p.risco >= 70 ? "danger" : "amber",
      href: "/projetos",
      label: "Ver projeto",
      peso: p.risco - 5,
    });
  }
  const hojeMs = hoje.getTime();
  const leadsFrios = (clientes ?? [])
    .filter((c) => (leadsAtivosStatus as readonly string[]).includes(c.status))
    .map((c) => ({
      nome: c.nome,
      dias: c.ultima_interacao ? Math.round((hojeMs - new Date(c.ultima_interacao).getTime()) / 86_400_000) : 999,
    }))
    .filter((c) => c.dias >= 14)
    .sort((a, b) => b.dias - a.dias);
  for (const l of leadsFrios.slice(0, 2)) {
    alertas.push({
      valor: l.dias >= 999 ? "sem contato" : `${l.dias}d`,
      texto: `Lead **${l.nome}** esfriando — sem interação`,
      tone: "brand",
      href: "/crm",
      label: "Reengajar",
      peso: 40,
    });
  }
  alertas.sort((a, b) => b.peso - a.peso);
  const topAlertas = alertas.slice(0, 5);

  const dataHoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(hoje);
  const mesLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(hoje);

  const kpis = [
    { label: "PROJETOS ATIVOS", value: String(projetosAtivos), tone: "ok" as const },
    { label: "LEADS ATIVOS", value: String(leadsAtivos), tone: "ok" as const },
    { label: "VENDAS TOTAIS", value: formatMoney(vendasTotais), tone: "ok" as const },
    { label: "VENDAS PAGAS", value: formatMoney(recebido), tone: "ok" as const },
    { label: "VENDAS PENDENTES", value: formatMoney(pendente), tone: "amber" as const },
    { label: "MRR · ASAAS", value: formatMoney(mrr), tone: "ok" as const },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Dashboard</h1>
        <span className="text-[11.5px] text-mut">{dataHoje}</span>
        <button className="ml-auto rounded-lg bg-brand px-3.5 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark">
          + Novo
        </button>
      </div>

      {/* Resumo do dia (IA) */}
      <div className="flex items-start gap-3 rounded-xl border border-aqua/35 bg-gradient-to-r from-aqua/10 to-brand/[0.06] px-3.5 py-[11px]">
        <IaBadge className="mt-px" />
        <div className="min-w-0 text-[12.5px] leading-[1.5] text-ink">
          <Suspense fallback={<span className="text-mut">Gerando o resumo do dia…</span>}>
            <ResumoDia
              projetosAtivos={projetosAtivos}
              leadsAtivos={leadsAtivos}
              aReceber={formatMoney(pendente)}
              mrr={formatMoney(mrr)}
              nome={primeiroNome}
            />
          </Suspense>
        </div>
        <Link
          href="/assistente"
          className="ml-auto flex-none rounded-lg border border-line px-2.5 py-[5px] text-[11.5px] font-semibold text-ink transition-colors hover:border-aqua"
        >
          Abrir assistente
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className={`${card} px-3 py-2.5 transition-colors hover:border-brand`}>
            <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">{k.label}</div>
            <div className={`mt-0.5 text-[17px] font-extrabold tracking-[-0.02em] ${toneText[k.tone]}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Meta do mês */}
      <MetaMesCard
        userId={user?.id ?? ""}
        mesIso={mesInicioIso}
        mesLabel={mesLabel}
        meta={meta}
        recebidoMes={recebidoMes}
      />

      {/* Atenção necessária */}
      {topAlertas.length > 0 && (
        <div className={`${card} px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[12.5px] text-ink">Atenção necessária</b>
            <span className="text-[11px] text-mut">priorizado por impacto</span>
            <IaBadge />
          </div>
          <div className="mt-2 flex flex-col">
            {topAlertas.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 border-t border-line py-2">
                <span className={`flex-none rounded-md border px-2 py-[3px] text-[11px] font-bold ${
                  a.tone === "danger"
                    ? "border-danger/40 bg-danger/[0.08] text-danger"
                    : a.tone === "amber"
                      ? "border-warn/40 bg-warn/[0.08] text-warn"
                      : "border-line bg-soft text-ink"
                }`}>
                  {a.valor}
                </span>
                <span className="min-w-0 flex-1 text-[12.5px] text-ink">
                  <RichText text={a.texto} />
                </span>
                <Link
                  href={a.href}
                  className="ml-auto flex-none rounded-lg border border-line px-3 py-[5px] text-[11.5px] font-semibold text-ink transition-colors hover:border-brand"
                >
                  {a.label}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
