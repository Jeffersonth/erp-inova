import Link from "next/link";
import { IaBadge } from "@/components/ia-badge";
import { RichText } from "@/components/rich-text";
import { toneText } from "@/lib/tone";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { gerarResumoDia } from "@/lib/ai/resumo";

const card = "rounded-xl border border-line bg-card";
const leadsAtivosStatus = ["lead", "qualificado", "proposta", "negociacao"] as const;

export default async function DashboardPage() {
  const supabase = createClient();
  const hoje = new Date();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: projetos }, { data: clientes }, { data: assinaturas }, { data: recebimentos }, { data: perfil }] =
    await Promise.all([
      supabase.from("projetos").select("status"),
      supabase.from("clientes").select("status"),
      supabase.from("assinaturas").select("valor, status"),
      supabase.from("recebimentos").select("valor, valor_pago, moeda, status").eq("moeda", "BRL").neq("status", "pago"),
      user ? supabase.from("usuarios").select("nome").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

  const primeiroNome = perfil?.nome?.trim().split(/\s+/)[0] || undefined;

  const projetosAtivos = (projetos ?? []).filter((p) => p.status !== "concluido").length;
  const leadsAtivos = (clientes ?? []).filter((c) =>
    (leadsAtivosStatus as readonly string[]).includes(c.status),
  ).length;
  const mrr = (assinaturas ?? [])
    .filter((a) => a.status === "ativa")
    .reduce((sum, a) => sum + Number(a.valor), 0);
  const aReceber = (recebimentos ?? []).reduce(
    (sum, r) => sum + Math.max(0, Number(r.valor) - Number(r.valor_pago)),
    0,
  );

  const resumo = await gerarResumoDia({
    projetosAtivos,
    leadsAtivos,
    aReceber: formatMoney(aReceber),
    mrr: formatMoney(mrr),
    nome: primeiroNome,
  });

  const dataHoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(hoje);

  const kpis = [
    { label: "PROJETOS ATIVOS", value: String(projetosAtivos), delta: "dados reais", tone: "ok" as const },
    { label: "LEADS ATIVOS", value: String(leadsAtivos), delta: "dados reais", tone: "ok" as const },
    { label: "A RECEBER", value: formatMoney(aReceber), delta: "dados reais", tone: "ok" as const },
    { label: "MRR · ASAAS", value: formatMoney(mrr), delta: "dados reais", tone: "ok" as const },
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
          <RichText text={resumo} />
        </div>
        <Link
          href="/assistente"
          className="ml-auto flex-none rounded-lg border border-line px-2.5 py-[5px] text-[11.5px] font-semibold text-ink transition-colors hover:border-aqua"
        >
          Abrir assistente
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`${card} cursor-pointer px-3 py-2.5 transition-colors hover:border-brand`}
          >
            <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">{k.label}</div>
            <div className="mt-0.5 text-[18px] font-extrabold tracking-[-0.02em] text-ink">{k.value}</div>
            <div className={`mt-0.5 text-[11px] font-semibold ${toneText[k.tone]}`}>{k.delta}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
