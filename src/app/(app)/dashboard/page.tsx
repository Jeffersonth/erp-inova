import { normalizarRegistros, type ConversaLead } from "@/lib/prospeccao";
import { agendaDate } from "@/lib/agenda-items";
import {
  DashboardOverview,
  ZoneHeading,
} from "@/components/dashboard-overview";
import { Suspense } from "react";
import Link from "next/link";
import { IaBadge } from "@/components/ia-badge";
import { RichText } from "@/components/rich-text";
import { MetaMesCard } from "@/components/meta-mes-card";
import { toneText } from "@/lib/tone";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  previsaoReceita,
  lucroPorCliente,
  inadimplencia,
  type RecebimentoLike,
} from "@/lib/insights";
import {
  porCanal as leadsPorCanal,
  type LeadCanal,
  type LeadRegistro,
} from "@/lib/leads";
import { getStripeResumo } from "@/lib/stripe";
import {
  gerarAnaliseInsights,
  type NarrativaInput,
} from "@/lib/ai/insights-narrativa";
import type { Enums } from "@/lib/supabase/database.types";

const card = "erp-card";

function riscoTone(r: number) {
  if (r >= 60) return { txt: "text-danger", bg: "#E5484D" };
  if (r >= 35) return { txt: "text-warn", bg: "#C77700" };
  return { txt: "text-ok", bg: "#0E9F6E" };
}

async function AnaliseIA(props: NarrativaInput) {
  const texto = await gerarAnaliseInsights(props);
  return <RichText text={texto} />;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const hojeIso = agendaDate();
  // Meio-dia evita mudar de dia/mês entre o servidor UTC e Fortaleza.
  const hoje = new Date(`${hojeIso}T12:00:00Z`);
  const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const mesInicioIso = `${mesInicio.getFullYear()}-${String(mesInicio.getMonth() + 1).padStart(2, "0")}-01`;
  const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const proxMesIso = `${proxMes.getFullYear()}-${String(proxMes.getMonth() + 1).padStart(2, "0")}-01`;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: clientes, error: erroClientes },
    { data: assinaturas, error: erroAssinaturas },
    { data: recebimentos, error: erroRecebimentos },
    { data: custos, error: erroCustos },
    { data: metaRow },
    { data: leadsCanais, error: erroLeadsCanais },
    { data: leadsRegs, error: erroLeadsRegs },
    { data: conversas, error: erroConversas },
  ] = await Promise.all([
    supabase.from("clientes").select("id, nome, status, ultima_interacao"),
    supabase.from("assinaturas").select("valor, status"),
    supabase
      .from("recebimentos")
      .select(
        "cliente_id, valor, valor_pago, moeda, status, vencimento, data_pagamento, clientes(nome)",
      )
      .eq("moeda", "BRL"),
    supabase.from("custos").select("cliente_id, valor"),
    user
      ? supabase
          .from("metas_financeiras")
          .select("valor_meta")
          .eq("user_id", user.id)
          .eq("mes", mesInicioIso)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("leads_canais").select("id, nome, ordem").order("ordem"),
    supabase
      .from("leads_registros")
      .select(
        "id, canal_id, data, contatos, respostas, propostas, vendas, valor_vendido, observacoes",
      )
      .gte("data", mesInicioIso)
      .lt("data", proxMesIso),
    supabase
      .from<ConversaLead>("prospeccao_leads")
      .select("id,nome,status,proximo_contato,ultimo_contato"),
  ]);

  const stripeResumo = await getStripeResumo();
  const mrrLocal = (assinaturas ?? [])
    .filter((a) => a.status === "ativa")
    .reduce((sum, a) => sum + Number(a.valor), 0);
  const mrr = stripeResumo?.mrr ?? mrrLocal;

  const recs = recebimentos ?? [];
  const vendasTotais = recs.reduce((s, r) => s + Number(r.valor), 0);
  const recebido = recs.reduce((s, r) => s + Number(r.valor_pago), 0);
  const pendente = recs.reduce(
    (s, r) => s + Math.max(0, Number(r.valor) - Number(r.valor_pago)),
    0,
  );
  const recebidoMes = recs
    .filter(
      (r) =>
        r.data_pagamento &&
        r.data_pagamento >= mesInicioIso &&
        r.data_pagamento < proxMesIso,
    )
    .reduce((s, r) => s + Number(r.valor_pago), 0);
  const meta = metaRow ? Number(metaRow.valor_meta) : 0;
  const despesasTotais = (custos ?? []).reduce(
    (sum, c) => sum + Number(c.valor),
    0,
  );
  const erroFinanceiro = Boolean(
    erroAssinaturas || erroRecebimentos || erroCustos || erroClientes,
  );

  // Receita + previsão — recebido (valor_pago BRL) por mês nos últimos 5 meses
  // + projeção do próximo mês (média dos últimos 3). Layout do design mobile.
  const mesesRef: { label: string; ini: string; fim: string }[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const f = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 1);
    mesesRef.push({
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(d)
        .replace(".", ""),
      ini: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      fim: `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-01`,
    });
  }
  const serie = mesesRef.map((m) =>
    recs
      .filter(
        (r) =>
          r.data_pagamento &&
          r.data_pagamento >= m.ini &&
          r.data_pagamento < m.fim,
      )
      .reduce((s, r) => s + Number(r.valor_pago), 0),
  );
  const previsao = Math.round(serie.slice(-3).reduce((s, v) => s + v, 0) / 3);
  const proxLabel = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1))
    .replace(".", "");
  const maxV = Math.max(...serie, previsao, 1);
  const chartX = (i: number) => Math.round((i * 340) / 5);
  const chartY = (v: number) => Math.round(90 - (v / maxV) * 72);
  const histPath = serie
    .map((v, i) => `${i === 0 ? "M" : "L"}${chartX(i)},${chartY(v)}`)
    .join(" ");
  const areaPath = `${histPath} L${chartX(4)},90 L0,90 Z`;
  const prevPath = `M${chartX(4)},${chartY(serie[4])} L${chartX(5)},${chartY(previsao)}`;

  // Insights (previsões, lucro por cliente, riscos) — mesmos cálculos determinísticos
  // que alimentavam a antiga aba /insights, agora dentro do Dashboard.
  const contas = inadimplencia(recs);
  const prev = previsaoReceita(recs, assinaturas ?? []);
  const lucros = lucroPorCliente(
    clientes ?? [],
    recs as (RecebimentoLike & { clientes?: { nome: string } | null })[],
    custos ?? [],
  );
  const maiorPrev = Math.max(prev.otimista, 1);
  const cenarios = [
    { label: "Otimista", v: prev.otimista, cor: "#0E9F6E" },
    { label: "Base", v: prev.base, cor: "#C51E72" },
    { label: "Pessimista", v: prev.pessimista, cor: "#E5484D" },
  ];
  const lucroTop = lucros[0];
  const lucroPior = lucros.length > 1 ? lucros[lucros.length - 1] : null;
  const contaTop = contas[0] ?? null;
  const narrativa: NarrativaInput = {
    previsaoBase: formatMoney(prev.base),
    previsaoOtimista: formatMoney(prev.otimista),
    previsaoPessimista: formatMoney(prev.pessimista),
    mrr: formatMoney(prev.mrr),
    saldoAberto: formatMoney(prev.saldoAberto),
    lucroTop: lucroTop
      ? { nome: lucroTop.nome, lucro: formatMoney(lucroTop.lucro) }
      : null,
    clienteRisco:
      lucroPior && lucroPior.lucro < 0
        ? { nome: lucroPior.nome, lucro: formatMoney(lucroPior.lucro) }
        : null,
    projetoRisco: null,
    contaRisco: contaTop
      ? {
          cliente: contaTop.clienteNome,
          saldo: formatMoney(contaTop.saldo, contaTop.moeda as Enums<"moeda">),
          risco: contaTop.risco,
        }
      : null,
  };

  // Atenção necessária — priorizada por impacto (dados reais)
  type Alerta = {
    valor: string;
    texto: string;
    tone: "danger" | "amber" | "brand";
    href: string;
    label: string;
    peso: number;
  };
  const alertas: Alerta[] = [];

  for (const c of contas.slice(0, 4)) {
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
  alertas.sort((a, b) => b.peso - a.peso);
  const topAlertas = alertas.slice(0, 5);

  const dataHoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(hoje);
  const mesLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(hoje);

  const kpis = [
    {
      label: "VENDAS TOTAIS",
      value: formatMoney(vendasTotais),
      tone: "ok" as const,
    },
    {
      label: "VENDAS PAGAS",
      value: formatMoney(recebido),
      tone: "ok" as const,
    },
    {
      label: "VENDAS PENDENTES",
      value: formatMoney(pendente),
      tone: "amber" as const,
    },
    {
      label: "RECEITA RECORRENTE · MRR",
      value: formatMoney(mrr),
      tone: "ok" as const,
    },
    {
      label: "DESPESAS CADASTRADAS",
      value: formatMoney(despesasTotais),
      tone: "amber" as const,
    },
    {
      label: "RECEBIDO − DESPESAS",
      value: formatMoney(recebido - despesasTotais),
      tone: recebido >= despesasTotais ? ("ok" as const) : ("danger" as const),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">
          Dashboard
        </h1>
        <span className="text-[12.5px] text-mut">{dataHoje}</span>
        <span className="ml-auto rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-[11px] font-semibold text-brand">
          Visão geral do ERP
        </span>
      </div>

      <p className="text-[13px] text-mut">
        Seu dia, seus projetos e seu negócio em um só lugar. Os indicadores
        refletem os registros de cada área.
      </p>
      <nav
        aria-label="Áreas do dashboard"
        className="flex flex-wrap gap-2 text-xs font-bold"
      >
        <a
          href="#pessoal"
          className="rounded-lg border border-[#D5C5F1] bg-[#F0E9FC] px-4 py-2 text-[#5E348C]"
        >
          Pessoal ↓
        </a>
        <a
          href="#comercial"
          className="rounded-lg border border-[#F2C4DA] bg-[#FCE7F1] px-4 py-2 text-[#A91C63]"
        >
          Comercial ↓
        </a>
        <a
          href="#financeiro"
          className="rounded-lg border border-[#B5DECF] bg-[#E5F5EE] px-4 py-2 text-[#116448]"
        >
          Financeiro ↓
        </a>
      </nav>
      <Suspense
        fallback={
          <div className="erp-card p-6 text-sm text-mut" role="status">
            Carregando a visão geral das suas áreas…
          </div>
        }
      >
        <DashboardOverview
          today={hojeIso}
          conversas={conversas ?? []}
          conversasErro={Boolean(erroConversas)}
          clientesTotal={erroClientes ? null : (clientes ?? []).length}
          canais={
            erroLeadsRegs || erroLeadsCanais
              ? null
              : leadsPorCanal(
                  normalizarRegistros(
                    (leadsRegs ?? []) as LeadRegistro[],
                    (leadsCanais ?? []) as LeadCanal[],
                  ),
                  (leadsCanais ?? []) as LeadCanal[],
                )
          }
        />
      </Suspense>

      <section
        id="financeiro"
        aria-labelledby="financeiro-title"
        className="dashboard-zone dashboard-zone--finance scroll-mt-20"
      >
        <ZoneHeading
          id="financeiro-title"
          title="Financeiro"
          subtitle="Receitas, cobranças, meta do mês e previsões em reais."
          number="03"
        />
        {erroFinanceiro ? (
          <p role="alert" className="erp-card p-5 text-sm text-danger">
            Não foi possível carregar todos os dados financeiros. Atualize a
            página para tentar novamente.
          </p>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className={`${card} px-3 py-2.5 transition-colors hover:border-brand`}
                >
                  <div className="text-[11px] font-semibold tracking-[0.07em] text-mut">
                    {k.label}
                  </div>
                  <div
                    className={`mt-0.5 text-[18px] font-extrabold tracking-[-0.02em] ${toneText[k.tone]}`}
                  >
                    {k.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Meta do mês */}
            <MetaMesCard
              mesIso={mesInicioIso}
              mesLabel={mesLabel}
              meta={meta}
              recebidoMes={recebidoMes}
            />

            {/* Receita + previsão */}
            <div className={`${card} px-3.5 py-3`}>
              <div className="flex items-center gap-2">
                <b className="text-[13.5px] text-ink">Receita + previsão</b>
                <IaBadge />
              </div>
              <svg
                width="100%"
                height="110"
                viewBox="0 0 340 110"
                preserveAspectRatio="none"
                role="img"
                aria-label={`Receita recebida por mês nos últimos 5 meses e previsão de ${formatMoney(previsao)} para ${proxLabel}`}
                className="mt-2"
              >
                <line x1="0" y1="90" x2="340" y2="90" stroke="#EBE5EF" />
                <path d={areaPath} fill="rgba(197,30,114,.07)" />
                <path
                  className="dashboard-line"
                  pathLength="1"
                  d={histPath}
                  fill="none"
                  stroke="#C51E72"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={prevPath}
                  fill="none"
                  stroke="#FF7939"
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                />
                <circle
                  cx={chartX(4)}
                  cy={chartY(serie[4])}
                  r="3.5"
                  fill="#C51E72"
                />
                {serie.map((v, i) => (
                  <circle
                    key={i}
                    cx={chartX(i)}
                    cy={chartY(v)}
                    r="9"
                    fill="transparent"
                  >
                    <title>{`${mesesRef[i].label}: ${formatMoney(v)}`}</title>
                  </circle>
                ))}
                <circle
                  cx={chartX(5)}
                  cy={chartY(previsao)}
                  r="9"
                  fill="transparent"
                >
                  <title>{`${proxLabel} (previsão): ${formatMoney(previsao)}`}</title>
                </circle>
              </svg>
              <div className="mt-1 flex justify-between text-[11px] text-mut">
                {mesesRef.map((m) => (
                  <span key={m.ini}>{m.label}</span>
                ))}
                <span className="font-semibold text-ia">{proxLabel}·prev</span>
              </div>
              <div className="mt-1.5 text-[12px] text-mut">
                Previsão de {proxLabel}:{" "}
                <b className="text-ink">{formatMoney(previsao)}</b> — média dos
                últimos 3 meses recebidos
              </div>
            </div>

            {/* Atenção necessária */}
            {topAlertas.length > 0 && (
              <div className={`${card} px-3.5 py-3`}>
                <div className="flex items-center gap-2">
                  <b className="text-[13.5px] text-ink">Atenção financeira</b>
                  <span className="text-[12px] text-mut">
                    priorizado por impacto
                  </span>
                  <IaBadge />
                </div>
                <div className="mt-2 flex flex-col">
                  {topAlertas.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 border-t border-line py-2"
                    >
                      <span
                        className={`flex-none rounded-md border px-2 py-[3px] text-[12px] font-bold ${
                          a.tone === "danger"
                            ? "border-danger/40 bg-danger/[0.08] text-danger"
                            : a.tone === "amber"
                              ? "border-warn/40 bg-warn/[0.08] text-warn"
                              : "border-line bg-soft text-ink"
                        }`}
                      >
                        {a.valor}
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] text-ink">
                        <RichText text={a.texto} />
                      </span>
                      <Link
                        href={a.href}
                        className="ml-auto flex-none rounded-lg border border-line px-3 py-[5px] text-[12.5px] font-semibold text-ink transition-colors hover:border-brand"
                      >
                        {a.label}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights — previsões e análises a partir dos dados reais */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.07em] text-mut">
                Insights
              </span>
              <span className="text-[11.5px] text-mut">
                previsões e análises geradas a partir dos seus dados
              </span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-aqua/35 bg-gradient-to-r from-aqua/10 to-brand/[0.06] px-3.5 py-[11px]">
              <IaBadge className="mt-px" />
              <div className="min-w-0 text-[13.5px] leading-[1.55] text-ink">
                <Suspense
                  fallback={
                    <span className="text-mut">Analisando seus números…</span>
                  }
                >
                  <AnaliseIA {...narrativa} />
                </Suspense>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.3fr_1fr]">
              {/* Previsão de receita */}
              <div className={`${card} px-3.5 py-3`}>
                <div className="flex items-center gap-2">
                  <b className="text-[13.5px] text-ink">
                    Previsão de receita · 90 dias
                  </b>
                  <IaBadge>3 CENÁRIOS</IaBadge>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {cenarios.map((c) => (
                    <div
                      key={c.label}
                      className="grid grid-cols-[70px_1fr_92px] items-center gap-2 text-[12.5px]"
                    >
                      <span className="text-mut">{c.label}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-soft">
                        <div
                          className="dashboard-bar h-full rounded-full"
                          style={{
                            width: `${Math.round((c.v / maiorPrev) * 100)}%`,
                            background: c.cor,
                          }}
                        />
                      </div>
                      <b className="text-right text-ink">{formatMoney(c.v)}</b>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-line pt-2.5 text-[12px] text-mut">
                  <span>
                    MRR recorrente:{" "}
                    <b className="text-ink">{formatMoney(prev.mrr)}</b>
                  </span>
                  <span>
                    Saldo em aberto:{" "}
                    <b className="text-ink">{formatMoney(prev.saldoAberto)}</b>
                  </span>
                  <span>
                    Média mensal (3m):{" "}
                    <b className="text-ink">
                      {formatMoney(Math.round(prev.mediaMensal))}
                    </b>
                  </span>
                </div>
              </div>

              {/* Lucro por cliente */}
              <div className={`${card} px-3.5 py-3`}>
                <b className="text-[13.5px] text-ink">Lucro por cliente</b>
                {lucros.length === 0 ? (
                  <div className="mt-3 text-[13px] text-mut">
                    Sem dados suficientes ainda — registre vendas e despesas por
                    cliente.
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-2">
                    {lucros.slice(0, 6).map((l) => (
                      <div
                        key={l.clienteId}
                        className="grid grid-cols-[1fr_64px_54px] items-center gap-2 text-[12.5px]"
                      >
                        <span className="truncate text-ink">{l.nome}</span>
                        <b
                          className={`text-right ${l.lucro >= 0 ? "text-ok" : "text-danger"}`}
                        >
                          {formatMoney(l.lucro)}
                        </b>
                        <span className="text-right text-mut">{l.margem}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Risco de inadimplência */}
              <div className={`${card} px-3.5 py-3`}>
                <div className="flex items-center gap-2">
                  <b className="text-[13.5px] text-ink">
                    Risco de inadimplência · contas
                  </b>
                  <IaBadge />
                </div>
                {contas.length === 0 ? (
                  <div className="mt-3 text-[13px] text-mut">
                    Nenhuma conta em aberto. 🎉
                  </div>
                ) : (
                  <div className="mt-2.5 flex flex-col gap-2">
                    {contas.slice(0, 5).map((c, i) => {
                      const t = riscoTone(c.risco);
                      return (
                        <div key={i} className="flex items-center gap-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-ink">
                              {c.clienteNome}
                            </div>
                            <div className="truncate text-[11.5px] text-mut">
                              {formatMoney(c.saldo, c.moeda as Enums<"moeda">)}
                              {c.diasAtraso > 0
                                ? ` · ${c.diasAtraso} dia(s) em atraso`
                                : " · em aberto"}
                            </div>
                          </div>
                          <b
                            className={`w-[38px] flex-none text-right text-[12.5px] ${t.txt}`}
                          >
                            {c.risco}%
                          </b>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
