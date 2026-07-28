"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/components/app-providers";
import {
  salvarLeadRegistro,
  excluirLeadRegistro,
  salvarLeadMeta,
  excluirLeadMeta,
  ajustarLeadMetaManual,
} from "@/lib/actions/leads";
import { formatMoney } from "@/lib/format";
import { IaBadge } from "@/components/ia-badge";
import { RichText } from "@/components/rich-text";
import { LeadConverter } from "@/components/lead-converter";
import {
  totais,
  porCanal,
  ranking,
  porDia,
  porMes,
  funil,
  progressoMeta,
  insightsLeads,
  METRICA_LABEL,
  type LeadCanal,
  type LeadRegistro,
  type LeadMeta,
  type LeadMetaMetrica,
} from "@/lib/leads";

const card = "rounded-xl border border-line bg-card";

/* ---------------- datas (fuso local do navegador) ---------------- */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDias = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtCurto = (isoStr: string) => `${isoStr.slice(8, 10)}/${isoStr.slice(5, 7)}`;
const fmtLongo = (isoStr: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(isoStr + "T00:00:00"));

type Periodo = "hoje" | "semana" | "mes" | "ano" | "custom";
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
  { id: "custom", label: "Personalizado" },
];

type Props = {
  canais: LeadCanal[];
  registrosInicial: LeadRegistro[];
  metasInicial: LeadMeta[];
  mesInicioIso: string;
  analiseIa: React.ReactNode;
};

export function LeadsBoard({ canais, registrosInicial, metasInicial, mesInicioIso, analiseIa }: Props) {
  const { toast } = useApp();

  const [regs, setRegs] = useState<LeadRegistro[]>(registrosInicial);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const hoje = new Date();
  const [customIni, setCustomIni] = useState(iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  const [customFim, setCustomFim] = useState(iso(hoje));
  const [dialogReg, setDialogReg] = useState<LeadRegistro | "novo" | null>(null);
  const [calRef, setCalRef] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [selDia, setSelDia] = useState<string | null>(iso(hoje));
  const [metas, setMetas] = useState<LeadMeta[]>(metasInicial);
  const [dialogMeta, setDialogMeta] = useState<LeadMeta | "nova" | null>(null);

  /* ---------------- período selecionado ---------------- */
  const { ini, fim } = useMemo(() => {
    const h = new Date();
    if (periodo === "hoje") return { ini: iso(h), fim: iso(h) };
    if (periodo === "semana") return { ini: iso(addDias(h, -6)), fim: iso(h) };
    if (periodo === "mes")
      return {
        ini: iso(new Date(h.getFullYear(), h.getMonth(), 1)),
        fim: iso(new Date(h.getFullYear(), h.getMonth() + 1, 0)),
      };
    if (periodo === "ano") return { ini: `${h.getFullYear()}-01-01`, fim: `${h.getFullYear()}-12-31` };
    const a = customIni <= customFim ? customIni : customFim;
    const b = customIni <= customFim ? customFim : customIni;
    return { ini: a, fim: b };
  }, [periodo, customIni, customFim]);

  const regsPeriodo = useMemo(() => regs.filter((r) => r.data >= ini && r.data <= fim), [regs, ini, fim]);
  const tot = useMemo(() => totais(regsPeriodo), [regsPeriodo]);
  const stats = useMemo(() => porCanal(regsPeriodo, canais).sort((a, b) => b.receita - a.receita || b.contatos - a.contatos), [regsPeriodo, canais]);
  const rank = useMemo(() => ranking(stats), [stats]);
  const fun = useMemo(() => funil(tot), [tot]);
  const serie30 = useMemo(() => porDia(regs, iso(addDias(new Date(), -29)), iso(new Date())), [regs]);
  const meses6 = useMemo(() => porMes(regs, 6), [regs]);
  const canalNome = useMemo(() => new Map(canais.map((c) => [c.id, c.nome])), [canais]);
  const achados = useMemo(() => insightsLeads(regs, canais), [regs, canais]);

  /* ---------------- CRUD ---------------- */
  async function salvar(form: FormData, existente: LeadRegistro | null) {
    const payload = {
      data: String(form.get("data") || iso(new Date())),
      canal_id: String(form.get("canal_id") || ""),
      contatos: Math.max(0, Number(form.get("contatos")) || 0),
      respostas: Math.max(0, Number(form.get("respostas")) || 0),
      propostas: Math.max(0, Number(form.get("propostas")) || 0),
      vendas: Math.max(0, Number(form.get("vendas")) || 0),
      valor_vendido: Math.max(0, Number(String(form.get("valor_vendido")).replace(",", ".")) || 0),
      observacoes: String(form.get("observacoes") || "").trim() || null,
    };
    if (!payload.canal_id) {
      toast("Escolha o canal de aquisição.");
      return;
    }

    const { data, error } = await salvarLeadRegistro(existente?.id ?? null, payload);
    if (error) {
      toast(error);
      return;
    }
    if (existente) {
      setRegs((prev) => prev.map((r) => (r.id === existente.id ? { ...r, ...payload } : r)));
      toast("✓ Registro atualizado");
    } else if (data) {
      setRegs((prev) => [data as LeadRegistro, ...prev].sort((a, b) => b.data.localeCompare(a.data)));
      toast("✓ Registro de prospecção criado");
    }
    setDialogReg(null);
  }

  async function excluir(r: LeadRegistro) {
    if (!confirm(`Excluir o registro de ${fmtCurto(r.data)} (${canalNome.get(r.canal_id) ?? "canal"})?`)) return;
    setRegs((prev) => prev.filter((x) => x.id !== r.id));
    setDialogReg(null);
    await excluirLeadRegistro(r.id);
  }

  /* ---------------- metas ---------------- */
  async function salvarMeta(form: FormData, existente: LeadMeta | null) {
    const metrica = String(form.get("metrica") || "contatos") as LeadMetaMetrica;
    const canalId = String(form.get("canal_id") || "") || null;
    const alvo = Math.max(0, Number(String(form.get("alvo")).replace(",", ".")) || 0);
    let titulo = String(form.get("titulo") || "").trim();
    if (!titulo) {
      const canal = canalId ? canalNome.get(canalId) : null;
      titulo = `${METRICA_LABEL[metrica].split(" (")[0]}${canal ? ` · ${canal}` : ""}`;
    }
    if (alvo <= 0) {
      toast("Informe o alvo da meta (maior que zero).");
      return;
    }
    const payload = { titulo, metrica, canal_id: metrica === "manual" ? null : canalId, alvo, mes: mesInicioIso };

    const { data, error } = await salvarLeadMeta(existente?.id ?? null, payload);
    if (error) {
      toast(error);
      return;
    }
    if (existente) {
      setMetas((prev) => prev.map((m) => (m.id === existente.id ? { ...m, ...payload } : m)));
      toast("✓ Meta atualizada");
    } else if (data) {
      setMetas((prev) => [...prev, data as LeadMeta]);
      toast("✓ Meta criada");
    }
    setDialogMeta(null);
  }

  async function excluirMeta(m: LeadMeta) {
    if (!confirm(`Excluir a meta "${m.titulo}"?`)) return;
    setMetas((prev) => prev.filter((x) => x.id !== m.id));
    setDialogMeta(null);
    await excluirLeadMeta(m.id);
  }

  async function ajustarMetaManual(m: LeadMeta, delta: number) {
    const novo = Math.max(0, Number(m.atual_manual) + delta);
    setMetas((prev) => prev.map((x) => (x.id === m.id ? { ...x, atual_manual: novo } : x)));
    await ajustarLeadMetaManual(m.id, novo);
  }

  /* ---------------- calendário ---------------- */
  const calDias = useMemo(() => {
    const ano = calRef.getFullYear();
    const mes = calRef.getMonth();
    const primeiro = new Date(ano, mes, 1);
    const nDias = new Date(ano, mes + 1, 0).getDate();
    const porData = new Map<string, { contatos: number; vendas: number }>();
    for (const r of regs) {
      if (!r.data.startsWith(`${ano}-${String(mes + 1).padStart(2, "0")}`)) continue;
      const a = porData.get(r.data) ?? { contatos: 0, vendas: 0 };
      a.contatos += r.contatos;
      a.vendas += r.vendas;
      porData.set(r.data, a);
    }
    const maxContatos = Math.max(1, ...Array.from(porData.values()).map((v) => v.contatos));
    const cells: { iso: string; dia: number; contatos: number; vendas: number; intensidade: number }[] = [];
    for (let d = 1; d <= nDias; d++) {
      const isoStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const v = porData.get(isoStr) ?? { contatos: 0, vendas: 0 };
      cells.push({ iso: isoStr, dia: d, ...v, intensidade: v.contatos / maxContatos });
    }
    return { offset: primeiro.getDay(), cells };
  }, [calRef, regs]);

  const diaSel = useMemo(() => {
    if (!selDia) return null;
    const doDia = regs.filter((r) => r.data === selDia);
    return { data: selDia, registros: doDia, ...totais(doDia) };
  }, [selDia, regs]);

  /* ---------------- timeline ---------------- */
  const timeline = useMemo(() => {
    const porData = new Map<string, LeadRegistro[]>();
    for (const r of regs) {
      const arr = porData.get(r.data);
      if (arr) arr.push(r);
      else porData.set(r.data, [r]);
    }
    return Array.from(porData.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12);
  }, [regs]);

  /* ---------------- gráficos ---------------- */
  const max30 = Math.max(1, ...serie30.map((d) => d.contatos));
  const maxMes = Math.max(1, ...meses6.map((m) => m.contatos));
  const maxVendasCanal = Math.max(1, ...stats.map((c) => c.vendas));
  const maxReceitaCanal = Math.max(1, ...stats.map((c) => c.receita));
  const mesAtual = meses6[meses6.length - 1];
  const mesAnterior = meses6[meses6.length - 2];
  const deltaContatos = mesAnterior && mesAnterior.contatos > 0
    ? Math.round(((mesAtual.contatos - mesAnterior.contatos) / mesAnterior.contatos) * 100)
    : null;

  const kpis = [
    { label: "CONTATOS", valor: String(tot.contatos), tone: "text-ink" },
    { label: "RESPOSTAS", valor: String(tot.respostas), tone: "text-ink" },
    { label: "PROPOSTAS", valor: String(tot.propostas), tone: "text-ink" },
    { label: "VENDAS", valor: String(tot.vendas), tone: "text-ok" },
    { label: "RECEITA", valor: formatMoney(tot.receita), tone: "text-ok" },
    { label: "TAXA DE RESPOSTA", valor: `${tot.taxaResposta}%`, tone: "text-ink" },
    { label: "TAXA DE CONVERSÃO", valor: `${tot.taxaConversao}%`, tone: "text-ink" },
    { label: "TICKET MÉDIO", valor: formatMoney(tot.ticketMedio), tone: "text-ink" },
  ];

  const funilOpacidade = [1, 0.72, 0.48, 0.3];

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">Leads</h1>
        <span className="text-[12.5px] text-mut">inteligência comercial da sua prospecção</span>
        <div className="ml-auto flex items-center gap-1.5">
          <LeadConverter canais={canais} />
          <button
            onClick={() => setDialogReg("novo")}
            className="rounded-lg bg-brand px-3.5 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            + Novo registro
          </button>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              periodo === p.id ? "border-brand bg-brand/[0.06] text-brand" : "border-line bg-card text-mut hover:border-brand"
            }`}
          >
            {p.label}
          </button>
        ))}
        {periodo === "custom" && (
          <span className="flex items-center gap-1.5">
            <input
              type="date"
              value={customIni}
              onChange={(e) => setCustomIni(e.target.value)}
              className="rounded-lg border border-line bg-card px-2 py-1 text-[12.5px] text-ink outline-none focus:border-brand"
            />
            <span className="text-[12px] text-mut">até</span>
            <input
              type="date"
              value={customFim}
              onChange={(e) => setCustomFim(e.target.value)}
              className="rounded-lg border border-line bg-card px-2 py-1 text-[12.5px] text-ink outline-none focus:border-brand"
            />
          </span>
        )}
        <span className="ml-auto text-[11.5px] text-mut">
          {fmtCurto(ini)} — {fmtCurto(fim)}
        </span>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${card} px-3 py-2.5 transition-colors hover:border-brand`}>
            <div className="text-[11px] font-semibold tracking-[0.07em] text-mut">{k.label}</div>
            <div className={`mt-0.5 truncate text-[18px] font-extrabold tracking-[-0.02em] ${k.tone}`}>{k.valor}</div>
          </div>
        ))}
      </div>

      {/* Funil + Ranking */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[13.5px] text-ink">Funil de conversão</b>
          <div className="mt-3 flex flex-col gap-2">
            {fun.map((e, i) => (
              <div key={e.label}>
                {e.pctEtapa !== null && (
                  <div className="mb-1 pl-1 text-[11px] text-mut">↓ {e.pctEtapa}% avançam</div>
                )}
                <div className="grid grid-cols-[76px_1fr_46px] items-center gap-2 text-[12.5px]">
                  <span className="text-mut">{e.label}</span>
                  <div className="h-4 overflow-hidden rounded-md bg-soft">
                    <div
                      className="flex h-full items-center rounded-md pl-1.5 text-[11px] font-bold text-white"
                      style={{ width: `${Math.max(e.pctDoTopo, e.valor > 0 ? 8 : 0)}%`, background: `rgba(29,91,255,${funilOpacidade[i]})` }}
                    >
                      {e.valor > 0 ? e.valor : ""}
                    </div>
                  </div>
                  <b className="text-right text-ink">{e.pctDoTopo}%</b>
                </div>
              </div>
            ))}
          </div>
          {tot.contatos === 0 && <div className="mt-2 text-[12.5px] text-mut">Sem registros no período — crie o primeiro em “+ Novo registro”.</div>}
        </div>

        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[13.5px] text-ink">Ranking de canais</b>
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { titulo: "💰 Maior faturamento", c: rank.maiorReceita, valor: rank.maiorReceita ? formatMoney(rank.maiorReceita.receita) : null },
              { titulo: "💬 Maior taxa de resposta", c: rank.maiorTaxaResposta, valor: rank.maiorTaxaResposta ? `${rank.maiorTaxaResposta.taxaResposta}%` : null },
              { titulo: "🎯 Maior conversão", c: rank.maiorConversao, valor: rank.maiorConversao ? `${rank.maiorConversao.taxaConversao}%` : null },
              { titulo: "📣 Mais contatos", c: rank.maisContatos, valor: rank.maisContatos ? String(rank.maisContatos.contatos) : null },
            ].map((r) => (
              <div key={r.titulo} className="rounded-lg border border-line bg-soft px-3 py-2.5">
                <div className="text-[11.5px] font-semibold text-mut">{r.titulo}</div>
                {r.c ? (
                  <>
                    <div className="mt-0.5 truncate text-[14px] font-bold text-ink">{r.c.nome}</div>
                    <div className="text-[12px] font-semibold text-brand">{r.valor}</div>
                  </>
                ) : (
                  <div className="mt-0.5 text-[12.5px] text-mut">sem dados no período</div>
                )}
              </div>
            ))}
          </div>
          {rank.maiorReceita && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-aqua/35 bg-gradient-to-r from-aqua/10 to-brand/[0.06] px-3 py-2 text-[12.5px]">
              <span>🏆</span>
              <span className="text-ink">
                Melhor canal do período: <b>{rank.maiorReceita.nome}</b> — {formatMoney(rank.maiorReceita.receita)} em{" "}
                {rank.maiorReceita.vendas} venda(s)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Leads por dia + por mês */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <div className={`${card} px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[13.5px] text-ink">Leads por dia</b>
            <span className="text-[11.5px] text-mut">últimos 30 dias · contatos (azul) e vendas (verde)</span>
          </div>
          <svg width="100%" height="96" viewBox="0 0 340 96" preserveAspectRatio="none" className="mt-2" role="img" aria-label="Contatos por dia nos últimos 30 dias">
            <line x1="0" y1="86" x2="340" y2="86" stroke="#DCE4F0" />
            {serie30.map((d, i) => {
              const bw = 340 / 30;
              const h = Math.round((d.contatos / max30) * 70);
              return (
                <g key={d.data}>
                  <rect x={i * bw + 1.5} y={86 - h} width={bw - 3} height={Math.max(h, d.contatos > 0 ? 2 : 0)} rx="1.5" fill="#1D5BFF">
                    <title>{`${fmtCurto(d.data)}: ${d.contatos} contato(s) · ${d.vendas} venda(s)`}</title>
                  </rect>
                  {d.vendas > 0 && <circle cx={i * bw + bw / 2} cy={86 - h - 5} r="2.5" fill="#0E9F6E" />}
                </g>
              );
            })}
          </svg>
          <div className="mt-1 flex justify-between text-[11px] text-mut">
            <span>{fmtCurto(serie30[0].data)}</span>
            <span>{fmtCurto(serie30[serie30.length - 1].data)}</span>
          </div>
        </div>

        <div className={`${card} px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[13.5px] text-ink">Leads por mês</b>
            <span className="text-[11.5px] text-mut">comparativo · 6 meses</span>
          </div>
          <svg width="100%" height="96" viewBox="0 0 340 96" preserveAspectRatio="none" className="mt-2" role="img" aria-label="Contatos por mês nos últimos 6 meses">
            <line x1="0" y1="86" x2="340" y2="86" stroke="#DCE4F0" />
            {meses6.map((m, i) => {
              const bw = 340 / 6;
              const h = Math.round((m.contatos / maxMes) * 66);
              return (
                <g key={m.iso}>
                  <rect x={i * bw + 8} y={86 - h} width={bw - 16} height={Math.max(h, m.contatos > 0 ? 2 : 0)} rx="2" fill={i === meses6.length - 1 ? "#1D5BFF" : "rgba(29,91,255,.45)"}>
                    <title>{`${m.label}: ${m.contatos} contato(s) · ${m.vendas} venda(s) · ${formatMoney(m.receita)}`}</title>
                  </rect>
                  {m.contatos > 0 && (
                    <text x={i * bw + bw / 2} y={82 - h} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0B1220">
                      {m.contatos}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="mt-1 grid grid-cols-6 text-center text-[11px] text-mut">
            {meses6.map((m) => (
              <span key={m.iso}>{m.label}</span>
            ))}
          </div>
          {deltaContatos !== null && (
            <div className="mt-1.5 text-[12px] text-mut">
              {mesAtual.label} vs {mesAnterior.label}:{" "}
              <b className={deltaContatos >= 0 ? "text-ok" : "text-danger"}>
                {deltaContatos >= 0 ? "▲" : "▼"} {Math.abs(deltaContatos)}%
              </b>{" "}
              em contatos · vendas {mesAnterior.vendas} → <b className="text-ink">{mesAtual.vendas}</b>
            </div>
          )}
        </div>
      </div>

      {/* Vendas e receita por canal */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[13.5px] text-ink">Vendas por canal</b>
          {stats.length === 0 ? (
            <div className="mt-3 text-[12.5px] text-mut">Sem dados no período.</div>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              {stats.slice(0, 6).map((c) => (
                <div key={c.canalId} className="grid grid-cols-[1fr_92px_30px] items-center gap-2 text-[12.5px]">
                  <span className="truncate text-ink">{c.nome}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-soft">
                    <div className="h-full rounded-full bg-ok" style={{ width: `${Math.round((c.vendas / maxVendasCanal) * 100)}%` }} />
                  </div>
                  <b className="text-right text-ink">{c.vendas}</b>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[13.5px] text-ink">Receita por canal</b>
          {stats.length === 0 ? (
            <div className="mt-3 text-[12.5px] text-mut">Sem dados no período.</div>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              {stats.slice(0, 6).map((c) => (
                <div key={c.canalId} className="grid grid-cols-[1fr_92px_76px] items-center gap-2 text-[12.5px]">
                  <span className="truncate text-ink">{c.nome}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-soft">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round((c.receita / maxReceitaCanal) * 100)}%`, background: "linear-gradient(90deg,#1D5BFF,#00D1FF)" }}
                    />
                  </div>
                  <b className="text-right text-ink">{formatMoney(c.receita)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metas do mês */}
      <div className={`${card} px-3.5 py-3`}>
        <div className="flex items-center gap-2">
          <b className="text-[13.5px] text-ink">Metas de {new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(mesInicioIso + "T00:00:00"))}</b>
          <span className="text-[12px] text-mut">progresso automático a partir dos registros</span>
          <button
            onClick={() => setDialogMeta("nova")}
            className="ml-auto rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:border-brand"
          >
            + Nova meta
          </button>
        </div>
        {metas.length === 0 ? (
          <div className="mt-2.5 text-[12.5px] text-mut">
            Nenhuma meta ainda. Ex: enviar 5.000 e-mails, realizar 120 ligações, fechar 15 clientes, R$ 30.000 no mês, 3 sites…
          </div>
        ) : (
          <div className="mt-2.5 grid grid-cols-1 gap-x-5 gap-y-2.5 lg:grid-cols-2">
            {metas.map((m) => {
              const atual = progressoMeta(m, regs);
              const pctM = Math.round((atual / Number(m.alvo)) * 100);
              const ehReceita = m.metrica === "receita";
              const fmt = (v: number) => (ehReceita ? formatMoney(v) : String(Math.round(v)));
              return (
                <div key={m.id}>
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <button onClick={() => setDialogMeta(m)} className="truncate font-semibold text-ink hover:text-brand" title="Editar meta">
                      {m.titulo}
                    </button>
                    {m.metrica === "manual" && (
                      <span className="flex flex-none items-center gap-1">
                        <button
                          onClick={() => ajustarMetaManual(m, -1)}
                          aria-label="Diminuir progresso"
                          className="flex size-[18px] items-center justify-center rounded-md border border-line text-[12px] text-mut hover:border-brand hover:text-ink"
                        >
                          −
                        </button>
                        <button
                          onClick={() => ajustarMetaManual(m, 1)}
                          aria-label="Aumentar progresso"
                          className="flex size-[18px] items-center justify-center rounded-md border border-line text-[12px] text-mut hover:border-brand hover:text-ink"
                        >
                          +
                        </button>
                      </span>
                    )}
                    <span className="ml-auto flex-none text-mut">
                      {fmt(atual)} / {fmt(Number(m.alvo))}
                    </span>
                    <b className={`w-[40px] flex-none text-right ${pctM >= 100 ? "text-ok" : "text-ink"}`}>{pctM}%</b>
                  </div>
                  <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-soft">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, pctM)}%`,
                        background: pctM >= 100 ? "#0E9F6E" : "linear-gradient(90deg,#1D5BFF,#00D1FF)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Insights Inteligentes */}
      <div className="flex items-start gap-3 rounded-xl border border-aqua/35 bg-gradient-to-r from-aqua/10 to-brand/[0.06] px-3.5 py-[11px]">
        <IaBadge className="mt-px" />
        <div className="min-w-0 whitespace-pre-wrap text-[13.5px] leading-[1.55] text-ink">{analiseIa}</div>
      </div>
      {achados.length > 0 && (
        <div className={`${card} px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[13.5px] text-ink">Insights Inteligentes</b>
            <IaBadge />
            <span className="text-[12px] text-mut">calculados de todo o seu histórico</span>
          </div>
          <div className="mt-2 flex flex-col gap-2 text-[13px]">
            {achados.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="mt-[5px] size-2 flex-none rounded-full"
                  style={{ background: a.tone === "ok" ? "#0E9F6E" : a.tone === "warn" ? "#C77700" : "#1D5BFF" }}
                />
                <span className="min-w-0 text-ink">
                  <RichText text={a.texto} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendário + dia selecionado */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.1fr_1fr]">
        <div className={`${card} px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[13.5px] text-ink">Calendário de prospecção</b>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setCalRef((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                aria-label="Mês anterior"
                className="flex size-6 items-center justify-center rounded-md border border-line text-mut hover:border-brand hover:text-ink"
              >
                ‹
              </button>
              <span className="w-[110px] text-center text-[12.5px] font-semibold capitalize text-ink">
                {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(calRef)}
              </span>
              <button
                onClick={() => setCalRef((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                aria-label="Próximo mês"
                className="flex size-6 items-center justify-center rounded-md border border-line text-mut hover:border-brand hover:text-ink"
              >
                ›
              </button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold uppercase tracking-[0.05em] text-mut">
            {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: calDias.offset }).map((_, i) => (
              <span key={`v${i}`} />
            ))}
            {calDias.cells.map((c) => {
              const sel = selDia === c.iso;
              return (
                <button
                  key={c.iso}
                  onClick={() => setSelDia(c.iso)}
                  className={`relative flex h-9 flex-col items-center justify-center rounded-lg border text-[12px] transition-colors ${
                    sel ? "border-brand bg-brand/[0.08] font-bold text-brand" : "border-line text-ink hover:border-brand"
                  }`}
                  style={c.contatos > 0 && !sel ? { background: `rgba(29,91,255,${0.06 + c.intensidade * 0.22})` } : undefined}
                  title={c.contatos > 0 ? `${c.contatos} contato(s) · ${c.vendas} venda(s)` : undefined}
                >
                  {c.dia}
                  {c.vendas > 0 && <span className="absolute bottom-[3px] size-[4px] rounded-full bg-ok" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[13.5px] capitalize text-ink">{diaSel ? fmtLongo(diaSel.data) : "Selecione um dia"}</b>
          {diaSel && (
            <>
              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { l: "CONTATOS", v: String(diaSel.contatos) },
                  { l: "RESPOSTAS", v: String(diaSel.respostas) },
                  { l: "PROPOSTAS", v: String(diaSel.propostas) },
                  { l: "VENDAS", v: String(diaSel.vendas) },
                  { l: "RECEITA", v: formatMoney(diaSel.receita) },
                  { l: "TAXA RESPOSTA", v: `${diaSel.taxaResposta}%` },
                ].map((x) => (
                  <div key={x.l} className="rounded-lg border border-line bg-soft px-2.5 py-2">
                    <div className="text-[10.5px] font-semibold tracking-[0.06em] text-mut">{x.l}</div>
                    <div className="truncate text-[15px] font-extrabold text-ink">{x.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {diaSel.registros.length === 0 && <div className="text-[12.5px] text-mut">Nenhum registro neste dia.</div>}
                {diaSel.registros.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setDialogReg(r)}
                    className="flex items-center gap-2 rounded-lg border border-line bg-soft px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:border-brand"
                  >
                    <b className="truncate text-ink">{canalNome.get(r.canal_id) ?? "Canal"}</b>
                    <span className="ml-auto flex-none text-mut">
                      {r.contatos}c · {r.respostas}r · {r.vendas}v
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Timeline / histórico */}
      <div className={`${card} px-3.5 py-3`}>
        <b className="text-[13.5px] text-ink">Histórico</b>
        {timeline.length === 0 ? (
          <div className="mt-2 text-[12.5px] text-mut">A timeline aparece aqui conforme você registra a prospecção.</div>
        ) : (
          <div className="mt-2.5 flex flex-col">
            {timeline.map(([data, items], i) => (
              <div key={data} className="relative flex gap-3 pb-3.5 last:pb-0">
                {i < timeline.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-line" />}
                <span className="mt-1 size-[11px] flex-none rounded-full border-2 border-brand bg-card" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-mut">{fmtLongo(data)}</div>
                  {items.map((r) => {
                    const partes = [
                      r.contatos > 0 ? `${r.contatos} contato(s)` : null,
                      r.respostas > 0 ? `${r.respostas} resposta(s)` : null,
                      r.propostas > 0 ? `${r.propostas} proposta(s)` : null,
                      r.vendas > 0 ? `${r.vendas} venda(s)` : null,
                      Number(r.valor_vendido) > 0 ? formatMoney(Number(r.valor_vendido)) : null,
                    ].filter(Boolean);
                    return (
                      <div key={r.id} className="mt-0.5 text-[13px] text-ink">
                        <b>{canalNome.get(r.canal_id) ?? "Canal"}</b>
                        <span className="text-mut"> — {partes.length ? partes.join(" · ") : "sem atividade"}</span>
                        {r.observacoes && <span className="text-mut"> · “{r.observacoes}”</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registros */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2 px-3.5 pt-3">
          <b className="text-[13.5px] text-ink">Registros</b>
          <span className="text-[12px] text-mut">{regsPeriodo.length} no período selecionado</span>
        </div>
        <div className="thin-scroll mt-2 overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[0.8fr_1.6fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr_0.5fr] gap-2 border-b border-line bg-soft px-3.5 py-2.5 text-[11px] font-semibold tracking-[0.07em] text-mut">
              <span>DATA</span>
              <span>CANAL</span>
              <span>CONTATOS</span>
              <span>RESPOSTAS</span>
              <span>PROPOSTAS</span>
              <span>VENDAS</span>
              <span>VALOR</span>
              <span />
            </div>
            {regsPeriodo.length === 0 && (
              <div className="px-3.5 py-7 text-center text-[13.5px] text-mut">
                Nenhum registro no período. Clique em &ldquo;+ Novo registro&rdquo; para começar.
              </div>
            )}
            {regsPeriodo.slice(0, 40).map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[0.8fr_1.6fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr_0.5fr] items-center gap-2 border-b border-line px-3.5 py-2.5 text-[13px] transition-colors last:border-b-0 hover:bg-soft"
              >
                <span className="text-mut">{fmtCurto(r.data)}</span>
                <b className="truncate text-ink">{canalNome.get(r.canal_id) ?? "—"}</b>
                <span>{r.contatos}</span>
                <span>{r.respostas}</span>
                <span>{r.propostas}</span>
                <span className={r.vendas > 0 ? "font-bold text-ok" : ""}>{r.vendas}</span>
                <span className={Number(r.valor_vendido) > 0 ? "font-semibold text-ink" : "text-mut"}>
                  {formatMoney(Number(r.valor_vendido))}
                </span>
                <button
                  onClick={() => setDialogReg(r)}
                  className="justify-self-end rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:border-brand"
                >
                  ✎
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dialog nova/editar meta */}
      <Dialog open={dialogMeta !== null} onOpenChange={(o) => !o && setDialogMeta(null)}>
        <DialogContent className="w-[420px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[420px]">
          {dialogMeta !== null && (
            <MetaForm
              key={dialogMeta === "nova" ? "nova" : dialogMeta.id}
              canais={canais}
              meta={dialogMeta === "nova" ? null : dialogMeta}
              onSave={(form) => salvarMeta(form, dialogMeta === "nova" ? null : dialogMeta)}
              onDelete={dialogMeta === "nova" ? undefined : () => excluirMeta(dialogMeta as LeadMeta)}
              onClose={() => setDialogMeta(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog novo/editar registro */}
      <Dialog open={dialogReg !== null} onOpenChange={(o) => !o && setDialogReg(null)}>
        <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
          {dialogReg !== null && (
            <RegistroForm
              key={dialogReg === "novo" ? "novo" : dialogReg.id}
              canais={canais}
              registro={dialogReg === "novo" ? null : dialogReg}
              onSave={(form) => salvar(form, dialogReg === "novo" ? null : dialogReg)}
              onDelete={dialogReg === "novo" ? undefined : () => excluir(dialogReg as LeadRegistro)}
              onClose={() => setDialogReg(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- form de registro ---------------- */
const fieldCls =
  "mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand";
const labelCls = "text-[11.5px] font-semibold text-mut";

function MetaForm({
  canais,
  meta,
  onSave,
  onDelete,
  onClose,
}: {
  canais: LeadCanal[];
  meta: LeadMeta | null;
  onSave: (form: FormData) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [metrica, setMetrica] = useState<LeadMetaMetrica>(meta?.metrica ?? "contatos");
  return (
    <>
      <DialogTitle className="text-[15.5px] font-bold text-ink">{meta ? "Editar meta" : "Nova meta do mês"}</DialogTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(new FormData(e.currentTarget));
        }}
        className="mt-3 flex flex-col gap-2.5"
      >
        <div>
          <label className={labelCls}>O que você quer medir? *</label>
          <select
            name="metrica"
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as LeadMetaMetrica)}
            className={fieldCls}
          >
            {(Object.keys(METRICA_LABEL) as LeadMetaMetrica[]).map((m) => (
              <option key={m} value={m}>
                {METRICA_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        {metrica !== "manual" && (
          <div>
            <label className={labelCls}>Canal</label>
            <select name="canal_id" defaultValue={meta?.canal_id ?? ""} className={fieldCls}>
              <option value="">Todos os canais</option>
              {canais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={labelCls}>Alvo *</label>
          <input
            name="alvo"
            type="number"
            min="1"
            step={metrica === "receita" ? "0.01" : "1"}
            required
            defaultValue={meta ? Number(meta.alvo) : ""}
            placeholder={metrica === "receita" ? "30000" : metrica === "manual" ? "3" : "5000"}
            className={fieldCls}
          />
        </div>
        <div>
          <label className={labelCls}>Título (opcional — gerado automaticamente)</label>
          <input
            name="titulo"
            defaultValue={meta?.titulo ?? ""}
            placeholder={metrica === "manual" ? "Ex: Sites entregues, Projetos de IA…" : "Ex: Enviar 5.000 e-mails"}
            className={fieldCls}
          />
        </div>
        {metrica === "manual" && (
          <div className="rounded-lg border border-dashed border-line bg-soft px-3 py-2 text-[12px] text-mut">
            Metas manuais (sites, IA &amp; automações, dashboards…) têm o progresso ajustado pelos botões − / + na lista.
          </div>
        )}
        <div className="mt-1 flex items-center justify-between gap-2">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-danger/40 px-3.5 py-[7px] text-[13px] font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-3.5 py-[7px] text-[13px] font-semibold text-ink transition-colors hover:border-brand"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              {meta ? "Salvar" : "Criar meta"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function RegistroForm({
  canais,
  registro,
  onSave,
  onDelete,
  onClose,
}: {
  canais: LeadCanal[];
  registro: LeadRegistro | null;
  onSave: (form: FormData) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <DialogTitle className="text-[15.5px] font-bold text-ink">
        {registro ? "Editar registro" : "Novo registro de prospecção"}
      </DialogTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(new FormData(e.currentTarget));
        }}
        className="mt-3 flex flex-col gap-2.5"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelCls}>Data *</label>
            <input name="data" type="date" required defaultValue={registro?.data ?? iso(new Date())} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Canal *</label>
            <select name="canal_id" required defaultValue={registro?.canal_id ?? ""} className={fieldCls}>
              <option value="" disabled>
                Escolha…
              </option>
              {canais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div>
            <label className={labelCls}>Contatos</label>
            <input name="contatos" type="number" min="0" defaultValue={registro?.contatos ?? 0} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Respostas</label>
            <input name="respostas" type="number" min="0" defaultValue={registro?.respostas ?? 0} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Propostas</label>
            <input name="propostas" type="number" min="0" defaultValue={registro?.propostas ?? 0} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Vendas</label>
            <input name="vendas" type="number" min="0" defaultValue={registro?.vendas ?? 0} className={fieldCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Valor vendido (R$, opcional)</label>
          <input
            name="valor_vendido"
            type="number"
            min="0"
            step="0.01"
            defaultValue={registro && Number(registro.valor_vendido) > 0 ? Number(registro.valor_vendido) : ""}
            placeholder="0,00"
            className={fieldCls}
          />
        </div>
        <div>
          <label className={labelCls}>Observações</label>
          <textarea
            name="observacoes"
            rows={2}
            defaultValue={registro?.observacoes ?? ""}
            placeholder="Ex: campanha para clínicas de SP…"
            className={`${fieldCls} resize-none`}
          />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-danger/40 px-3.5 py-[7px] text-[13px] font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-3.5 py-[7px] text-[13px] font-semibold text-ink transition-colors hover:border-brand"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              {registro ? "Salvar" : "Registrar"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
