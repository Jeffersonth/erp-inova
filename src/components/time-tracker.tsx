"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

type Modo = "foco" | "pausa_curta" | "pausa_longa";
type Preset = "classico" | "estendido";
type Categoria = Enums<"sessao_categoria">;

const PRESETS: Record<Preset, { label: string; config: Record<Modo, { label: string; min: number; cor: string }> }> = {
  classico: {
    label: "25 + 5 min",
    config: {
      foco: { label: "Foco", min: 25, cor: "#1D5BFF" },
      pausa_curta: { label: "Pausa curta", min: 5, cor: "#0E9F6E" },
      pausa_longa: { label: "Pausa longa", min: 15, cor: "#00D1FF" },
    },
  },
  estendido: {
    label: "50 + 10 min",
    config: {
      foco: { label: "Foco", min: 50, cor: "#1D5BFF" },
      pausa_curta: { label: "Descanso", min: 10, cor: "#0E9F6E" },
      pausa_longa: { label: "Pausa longa", min: 15, cor: "#00D1FF" },
    },
  },
};

const CATEGORIAS: Record<Categoria, { label: string; icone: string }> = {
  trabalho: { label: "Trabalho", icone: "💼" },
  estudo: { label: "Estudo", icone: "📚" },
};

export type SessaoRow = {
  id: string;
  tipo: Enums<"sessao_tipo">;
  categoria: Categoria;
  duracao_seg: number;
  rotulo: string | null;
  finalizada_em: string;
  projetos: { titulo: string } | null;
};

function mmss(seg: number) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function humano(seg: number) {
  const m = Math.round(seg / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}

function quando(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (sameDay(d, hoje)) return `hoje ${hora}`;
  if (sameDay(d, ontem)) return `ontem ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
}

export function TimeTracker({
  userId,
  projetos,
  historicoInicial,
  totalHojeInicial,
}: {
  userId: string;
  projetos: { id: string; titulo: string }[];
  historicoInicial: SessaoRow[];
  totalHojeInicial: number;
}) {
  const { toast } = useApp();
  const supabase = createClient();

  const [preset, setPreset] = useState<Preset>("classico");
  const [modo, setModo] = useState<Modo>("foco");
  const CONFIG = PRESETS[preset].config;
  const [restante, setRestante] = useState(CONFIG.foco.min * 60);
  const [rodando, setRodando] = useState(false);
  const [projetoId, setProjetoId] = useState("");
  const [rotulo, setRotulo] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("trabalho");
  const [historico, setHistorico] = useState<SessaoRow[]>(historicoInicial);
  const [focoHoje, setFocoHoje] = useState(totalHojeInicial);

  const inicioRef = useRef<number | null>(null); // timestamp de início da sessão atual
  const duracaoTotal = CONFIG[modo].min * 60;

  const registrar = useCallback(
    async (tipo: Modo, dur: number) => {
      const inicio = inicioRef.current ? new Date(inicioRef.current) : new Date(Date.now() - dur * 1000);
      const { data, error } = await supabase
        .from("sessoes_foco")
        .insert({
          user_id: userId,
          projeto_id: projetoId || null,
          tipo,
          categoria,
          duracao_seg: dur,
          rotulo: rotulo.trim() || null,
          iniciada_em: inicio.toISOString(),
          finalizada_em: new Date().toISOString(),
        })
        .select("id, tipo, categoria, duracao_seg, rotulo, finalizada_em, projetos(titulo)")
        .single();
      if (!error && data) {
        setHistorico((prev) => [data as SessaoRow, ...prev]);
        if (tipo === "foco") setFocoHoje((h) => h + dur);
      }
    },
    [supabase, userId, projetoId, rotulo, categoria],
  );

  // tick do timer
  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rodando]);

  // sessão terminou naturalmente
  useEffect(() => {
    if (rodando && restante === 0) {
      setRodando(false);
      registrar(modo, duracaoTotal);
      inicioRef.current = null;
      toast(modo === "foco" ? "✓ Sessão de foco concluída!" : "Pausa concluída — bora focar?");
      // reseta pro mesmo modo
      setRestante(duracaoTotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante, rodando]);

  function trocarModo(m: Modo) {
    setModo(m);
    setRodando(false);
    inicioRef.current = null;
    setRestante(CONFIG[m].min * 60);
  }

  function trocarPreset(p: Preset) {
    setPreset(p);
    setRodando(false);
    inicioRef.current = null;
    setRestante(PRESETS[p].config[modo].min * 60);
  }

  function iniciarPausar() {
    if (!rodando) {
      if (inicioRef.current === null) inicioRef.current = Date.now();
      setRodando(true);
    } else {
      setRodando(false);
    }
  }

  async function parar() {
    // registra o tempo decorrido se houver progresso relevante (>= 60s)
    const decorrido = duracaoTotal - restante;
    setRodando(false);
    if (decorrido >= 60) {
      await registrar(modo, decorrido);
      toast(`Sessão salva: ${humano(decorrido)} de ${CONFIG[modo].label.toLowerCase()}`);
    }
    inicioRef.current = null;
    setRestante(duracaoTotal);
  }

  const pct = duracaoTotal > 0 ? ((duracaoTotal - restante) / duracaoTotal) * 100 : 0;
  const cor = CONFIG[modo].cor;
  const R = 78;
  const circ = 2 * Math.PI * R;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.1fr]">
      {/* Timer */}
      <div className="rounded-xl border border-line bg-card px-3.5 py-4">
        <div className="flex justify-center gap-1">
          {(Object.keys(PRESETS) as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => trocarPreset(p)}
              className={`rounded-full border px-2.5 py-[3px] text-[11.5px] font-semibold transition-colors ${
                preset === p ? "border-aqua/45 bg-aqua/10 text-ia" : "border-line bg-soft text-mut hover:border-aqua/45"
              }`}
            >
              {PRESETS[p].label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-1.5">
          {(Object.keys(CONFIG) as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => trocarModo(m)}
              className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                modo === m ? "border-brand bg-brand/[0.06] text-brand" : "border-line bg-soft text-mut hover:border-brand"
              }`}
            >
              {CONFIG[m].label}
            </button>
          ))}
        </div>

        <div className="relative mx-auto mt-4 flex size-[188px] items-center justify-center">
          <svg width="188" height="188" viewBox="0 0 188 188" className="-rotate-90">
            <circle cx="94" cy="94" r={R} fill="none" stroke="#EDF2F9" strokeWidth="10" />
            <circle
              cx="94"
              cy="94"
              r={R}
              fill="none"
              stroke={cor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - (pct / 100) * circ}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[39px] font-extrabold tracking-[-0.03em] text-ink tabular-nums">{mmss(restante)}</span>
            <span className="text-[12px] font-semibold text-mut">{CONFIG[modo].label}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={iniciarPausar}
            className="rounded-lg bg-brand px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-brand-dark"
          >
            {rodando ? "⏸ Pausar" : restante === duracaoTotal ? "▶ Iniciar" : "▶ Retomar"}
          </button>
          <button
            onClick={parar}
            disabled={restante === duracaoTotal && !rodando}
            className="rounded-lg border border-line px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:border-brand disabled:opacity-50"
          >
            ⟲ Zerar
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={projetoId}
            onChange={(e) => setProjetoId(e.target.value)}
            className="rounded-lg border border-line bg-soft px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
          >
            <option value="">Sem projeto</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo}
              </option>
            ))}
          </select>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as Categoria)}
            className="rounded-lg border border-line bg-soft px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
          >
            {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORIAS[c].icone} {CATEGORIAS[c].label}
              </option>
            ))}
          </select>
        </div>
        <input
          value={rotulo}
          onChange={(e) => setRotulo(e.target.value)}
          placeholder="No que está focando?"
          className="mt-2 w-full rounded-lg border border-line bg-soft px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
        />

        <div className="mt-3 rounded-lg border border-dashed border-line bg-soft px-3 py-2 text-center text-[13px] text-mut">
          Foco de hoje: <b className="text-ok">{humano(focoHoje)}</b>
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-xl border border-line bg-card px-3.5 py-3">
        <div className="flex items-center gap-2">
          <b className="text-[13.5px] text-ink">Histórico de sessões</b>
          <span className="ml-auto text-[12px] text-mut">{historico.length} registradas</span>
        </div>
        <div className="thin-scroll mt-2 flex max-h-[360px] flex-col gap-1.5 overflow-y-auto">
          {historico.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-mut">
              Nenhuma sessão ainda. Inicie o timer e ele aparece aqui.
            </div>
          ) : (
            historico.map((s) => {
              const c = CONFIG[s.tipo as Modo];
              return (
                <div key={s.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-soft px-3 py-2">
                  <span className="size-2 flex-none rounded-full" style={{ background: c.cor }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-ink">
                      {CATEGORIAS[s.categoria]?.icone ?? "💼"} {s.rotulo || c.label}
                      {s.projetos?.titulo && <span className="text-mut"> · {s.projetos.titulo}</span>}
                    </div>
                    <div className="text-[11.5px] text-mut">{quando(s.finalizada_em)}</div>
                  </div>
                  <span className="flex-none text-[13px] font-semibold text-ink">{humano(s.duracao_seg)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
