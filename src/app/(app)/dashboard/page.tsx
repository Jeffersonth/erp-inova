import { Suspense } from "react";
import Link from "next/link";
import { IaBadge } from "@/components/ia-badge";
import { RichText } from "@/components/rich-text";
import { MetaMesCard } from "@/components/meta-mes-card";
import { toneText } from "@/lib/tone";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { gerarResumoDia } from "@/lib/ai/resumo";

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
    supabase.from("projetos").select("status"),
    supabase.from("clientes").select("status"),
    supabase.from("assinaturas").select("valor, status"),
    supabase.from("recebimentos").select("valor, valor_pago, moeda, status, data_pagamento").eq("moeda", "BRL"),
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
    </div>
  );
}
