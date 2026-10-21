"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IaBadge } from "@/components/ia-badge";
import { RichText } from "@/components/rich-text";
import { useApp } from "@/components/app-providers";
import { criarTarefaDia, atualizarTarefaDia } from "@/lib/actions/tarefas-dia";
import { useFocusTimer, PRESETS } from "@/components/focus-timer-provider";
import { formatDuracao } from "@/lib/format";
import type { Recomendacao, RadarItem } from "@/lib/central";
import { AgendaHoje } from "@/components/agenda-hoje";
import type { AgendaItem } from "@/lib/agenda-items";

const card = "erp-card";

export type PrioTarefa = {
  id: string;
  titulo: string;
  status: "pendente" | "em_andamento" | "concluida";
  ordem: number;
};

type Props = {
  nome: string;
  dataHoje: string;
  metaHorasDia: number;
  focoHojeSegInicial: number;
  tarefasInicial: PrioTarefa[];
  aReceber: { valor: string; sub: string };
  reunioes: { total: number; sub: string };
  recomendacao: Recomendacao;
  radar: RadarItem[];
  projetosAtivos: { id: string; titulo: string }[];
  agendaHoje: AgendaItem[];
  agendaErro: boolean;
};

function mmss(seg: number) {
  return `${String(Math.floor(seg / 60)).padStart(2, "0")}:${String(seg % 60).padStart(2, "0")}`;
}

function metaLabel(h: number) {
  const inteiro = Math.floor(h);
  const min = Math.round((h - inteiro) * 60);
  return min ? `${inteiro}h${String(min).padStart(2, "0")}` : `${inteiro}h`;
}

export function CentralHoje({
  nome,
  dataHoje,
  metaHorasDia,
  focoHojeSegInicial,
  tarefasInicial,
  aReceber,
  reunioes,
  recomendacao,
  radar,
  projetosAtivos,
  agendaHoje,
  agendaErro,
}: Props) {
  const { toast, openAiDraft } = useApp();

  const [saudacao, setSaudacao] = useState("Olá");
  useEffect(() => {
    const h = new Date().getHours();
    setSaudacao(h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite");
  }, []);

  /* ---------------- prioridades (tarefas_dia) ---------------- */
  const [tarefas, setTarefas] = useState<PrioTarefa[]>(tarefasInicial);
  const [novaPrio, setNovaPrio] = useState("");
  const concluidas = tarefas.filter((t) => t.status === "concluida").length;
  const pct = tarefas.length
    ? Math.round((concluidas / tarefas.length) * 100)
    : 0;

  async function togglePrio(id: string) {
    const t = tarefas.find((x) => x.id === id);
    if (!t) return;
    const novo = t.status === "concluida" ? "pendente" : "concluida";
    setTarefas((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: novo } : x)),
    );
    await atualizarTarefaDia(id, {
      status: novo,
      concluida_em: novo === "concluida" ? new Date().toISOString() : null,
    });
  }

  async function addPrio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const titulo = novaPrio.trim();
    if (!titulo) return;
    const ordem = tarefas.length
      ? Math.max(...tarefas.map((t) => t.ordem)) + 1
      : 0;
    const { data, error } = await criarTarefaDia({
      titulo,
      data_finalizar: null,
      ordem,
    });
    if (error || !data) {
      toast("Não foi possível criar a prioridade.");
      return;
    }
    setTarefas((prev) => [...prev, data as PrioTarefa]);
    setNovaPrio("");
  }

  const {
    restante,
    rodando,
    projetoId,
    setProjetoId,
    rotulo,
    setRotulo,
    focoHoje,
    duracaoTotal,
    iniciarPausar: toggleFoco,
    parar: finalizarFoco,
    hidratarHoje,
    modo,
    preset,
  } = useFocusTimer();
  useEffect(
    () => hidratarHoje(focoHojeSegInicial),
    [hidratarHoje, focoHojeSegInicial],
  );
  const ringDeg = ((duracaoTotal - restante) / duracaoTotal) * 360;

  /* ---------------- recomendação ---------------- */
  function agirRecomendacao() {
    if (!recomendacao.acao || recomendacao.acao.tipo !== "draft") return;
    const a = recomendacao.acao;
    openAiDraft(
      { tipo: a.draft, clienteId: a.clienteId, recebimentoId: a.recebimentoId },
      a.draft === "cobranca" ? "Cobrança" : "Mensagem",
    );
  }

  const dot: Record<RadarItem["cor"], string> = {
    danger: "#E5484D",
    warn: "#C77700",
    ok: "#0E9F6E",
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">
          {saudacao}, {nome} 👋
        </h1>
        <span className="text-[12.5px] text-mut">
          {dataHoje} · sua central de execução
        </span>
      </div>

      {/* Progresso do dia */}
      <div className={`${card} flex items-center gap-2.5 px-3.5 py-2.5`}>
        <span className="text-[12.5px] font-semibold text-mut">
          Progresso do dia
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-soft">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg,#C51E72,#FF7939)",
            }}
          />
        </div>
        <b className="text-[13.5px] text-ink">{pct}%</b>
      </div>

      {/* KPIs do dia */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className={`${card} px-3.5 py-2.5`}>
          <div className="text-[11px] font-semibold tracking-[0.06em] text-mut">
            TAREFAS
          </div>
          <b className="text-[19px] text-ink">{tarefas.length}</b>
          <div className="text-[11.5px] text-mut">
            {concluidas} concluída(s)
          </div>
        </div>
        <div className={`${card} px-3.5 py-2.5`}>
          <div className="text-[11px] font-semibold tracking-[0.06em] text-mut">
            A RECEBER
          </div>
          <b className="text-[19px] text-ok">{aReceber.valor}</b>
          <div className="truncate text-[11.5px] text-mut">{aReceber.sub}</div>
        </div>
        <div className={`${card} px-3.5 py-2.5`}>
          <div className="text-[11px] font-semibold tracking-[0.06em] text-mut">
            REUNIÕES
          </div>
          <b className="text-[19px] text-ink">{reunioes.total}</b>
          <div className="truncate text-[11.5px] text-mut">{reunioes.sub}</div>
        </div>
        <div className={`${card} px-3.5 py-2.5`}>
          <div className="text-[11px] font-semibold tracking-[0.06em] text-mut">
            META DE HORAS
          </div>
          <b className="text-[19px] text-ink">{formatDuracao(focoHoje)}</b>
          <div className="text-[11.5px] text-mut">
            de {metaLabel(metaHorasDia)}
          </div>
        </div>
      </div>

      <AgendaHoje items={agendaHoje} error={agendaErro} />

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2.5">
          {/* IA recomenda */}
          <div className="flex flex-col gap-2 rounded-xl border border-aqua/35 bg-gradient-to-r from-aqua/10 to-brand/[0.06] px-3.5 py-3">
            <IaBadge className="self-start">IA RECOMENDA</IaBadge>
            <div className="text-[13px] leading-[1.5] text-ink">
              <RichText text={recomendacao.texto} />
            </div>
            {recomendacao.acao?.tipo === "draft" && (
              <button
                onClick={agirRecomendacao}
                className="self-start rounded-lg bg-brand px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                {recomendacao.acao.label}
              </button>
            )}
            {recomendacao.acao?.tipo === "link" && (
              <Link
                href={recomendacao.acao.href}
                className="self-start rounded-lg bg-brand px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                {recomendacao.acao.label}
              </Link>
            )}
          </div>

          {/* Sessão de foco */}
          <div
            className="flex items-center gap-3.5 rounded-[14px] border border-[#443052] p-3.5 text-soft"
            style={{ background: "linear-gradient(160deg,#140D24,#2A1639)" }}
          >
            <div
              className="flex size-[78px] flex-none items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#FF7939 ${ringDeg}deg, rgba(244,247,251,.12) ${ringDeg}deg)`,
              }}
            >
              <div className="flex size-[66px] items-center justify-center rounded-full bg-[#140D24] text-[16px] font-extrabold tabular-nums">
                {mmss(restante)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <b className="text-[13.5px]">
                {PRESETS[preset].config[modo].label}
              </b>
              <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-[#B8AEC9]">
                <select
                  value={projetoId}
                  onChange={(e) => setProjetoId(e.target.value)}
                  className="max-w-[45%] cursor-pointer truncate border-none bg-transparent text-[11.5px] text-[#B8AEC9] outline-none"
                >
                  <option value="">Sem projeto</option>
                  {projetosAtivos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo}
                    </option>
                  ))}
                </select>
                ·
                <input
                  value={rotulo}
                  maxLength={2000}
                  onChange={(e) => setRotulo(e.target.value)}
                  placeholder="no que vai focar?"
                  className="min-w-0 flex-1 border-none bg-transparent text-[11.5px] text-[#B9C6DC] outline-none placeholder:text-[#B8AEC9]"
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  onClick={toggleFoco}
                  className="min-h-[36px] rounded-lg px-4 py-2 text-[13px] font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg,#C51E72,#FF7939)",
                  }}
                >
                  {rodando
                    ? "❚❚ Pausar"
                    : restante === duracaoTotal
                      ? "▶ Iniciar"
                      : "▶ Retomar"}
                </button>
                <button
                  onClick={finalizarFoco}
                  disabled={restante === duracaoTotal && !rodando}
                  title="Finalizar e salvar sessão"
                  className="min-h-[36px] rounded-lg border border-white/20 px-3 py-2 text-[13px] font-semibold text-[#B9C6DC] transition-colors hover:border-white/50 disabled:opacity-40"
                >
                  ⟲
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          {/* Prioridade máxima */}
          <div className={`${card} erp-card--rose px-3.5 py-3`}>
            <div className="flex items-center gap-2">
              <b className="text-[13.5px] text-ink">Prioridade máxima</b>
              <Link
                href="/tarefas"
                className="ml-auto text-[12px] font-semibold text-mut transition-colors hover:text-brand"
              >
                Ver todas →
              </Link>
            </div>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {tarefas.length === 0 && (
                <div className="py-1 text-[13px] text-mut">
                  Nenhuma prioridade ainda — adicione a primeira abaixo.
                </div>
              )}
              {tarefas.slice(0, 6).map((t) => {
                const done = t.status === "concluida";
                return (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <button
                      onClick={() => togglePrio(t.id)}
                      aria-label={done ? "Reabrir" : "Concluir"}
                      className={`flex size-[22px] flex-none items-center justify-center rounded-[7px] border text-[13px] font-bold transition-colors ${
                        done
                          ? "border-ok bg-ok text-white"
                          : "border-line bg-card text-transparent hover:border-brand"
                      }`}
                    >
                      ✓
                    </button>
                    <span
                      className={`min-w-0 flex-1 truncate text-[13.5px] ${done ? "text-mut line-through" : "text-ink"}`}
                    >
                      {t.titulo}
                    </span>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={addPrio}
              className="mt-2.5 flex gap-1.5 border-t border-dashed border-line pt-2.5"
            >
              <input
                value={novaPrio}
                onChange={(e) => setNovaPrio(e.target.value)}
                placeholder="Nova prioridade…"
                className="min-w-0 flex-1 rounded-lg border border-line bg-soft px-3 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
              />
              <button
                type="submit"
                className="flex-none rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                +
              </button>
            </form>
          </div>

          {/* Radar */}
          <div className={`${card} erp-card--peach px-3.5 py-3`}>
            <b className="text-[13.5px] text-ink">Radar</b>
            <div className="mt-2 flex flex-col gap-2 text-[13px]">
              {radar.length === 0 && (
                <div className="py-1 text-mut">
                  Nada no radar — tudo sob controle. 🎉
                </div>
              )}
              {radar.map((r, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span
                    className="size-2 flex-none rounded-full"
                    style={{ background: dot[r.cor] }}
                  />
                  <span className="min-w-0 text-ink">
                    <RichText text={r.texto} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
