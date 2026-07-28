"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/components/app-providers";
import { registrarSessaoFoco } from "@/lib/actions/tracker";
import { formatDuracao } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

export type Modo = "foco" | "pausa_curta" | "pausa_longa";
export type Preset = "classico" | "estendido";
export type Categoria = Enums<"sessao_categoria">;

export type SessaoRow = {
  id: string;
  tipo: Enums<"sessao_tipo">;
  categoria: Categoria;
  duracao_seg: number;
  rotulo: string | null;
  finalizada_em: string;
  projetos: { titulo: string } | null;
};

export const PRESETS: Record<Preset, { label: string; config: Record<Modo, { label: string; min: number; cor: string }> }> = {
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

export const CATEGORIAS: Record<Categoria, { label: string; icone: string }> = {
  trabalho: { label: "Trabalho", icone: "💼" },
  estudo: { label: "Estudo", icone: "📚" },
};

type Ctx = {
  preset: Preset;
  modo: Modo;
  restante: number;
  duracaoTotal: number;
  rodando: boolean;
  projetoId: string;
  rotulo: string;
  categoria: Categoria;
  historico: SessaoRow[];
  focoHoje: number;
  setProjetoId: (v: string) => void;
  setRotulo: (v: string) => void;
  setCategoria: (v: Categoria) => void;
  trocarModo: (m: Modo) => void;
  trocarPreset: (p: Preset) => void;
  iniciarPausar: () => void;
  parar: () => void;
  /** Semeia histórico/total do dia com os dados do SSR — só na primeira vez
   *  (o timer em si já vive aqui, não precisa disso a cada navegação). */
  hidratar: (historicoInicial: SessaoRow[], totalHojeInicial: number) => void;
};

const FocusTimerCtx = createContext<Ctx | null>(null);

export function useFocusTimer() {
  const ctx = useContext(FocusTimerCtx);
  if (!ctx) throw new Error("useFocusTimer deve ser usado dentro de <FocusTimerProvider>");
  return ctx;
}

/**
 * Motor do Time Tracker — montado uma vez no layout (app)/*, sobrevive à
 * navegação entre páginas. Antes vivia como estado local da página /tracker,
 * então sair da tela desmontava o componente e derrubava o setInterval.
 */
export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { toast } = useApp();

  const [preset, setPreset] = useState<Preset>("classico");
  const [modo, setModo] = useState<Modo>("foco");
  const CONFIG = PRESETS[preset].config;
  const [restante, setRestante] = useState(CONFIG.foco.min * 60);
  const [rodando, setRodando] = useState(false);
  const [projetoId, setProjetoId] = useState("");
  const [rotulo, setRotulo] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("trabalho");
  const [historico, setHistorico] = useState<SessaoRow[]>([]);
  const [focoHoje, setFocoHoje] = useState(0);

  const inicioRef = useRef<number | null>(null); // timestamp de início da sessão atual
  const hidratadoRef = useRef(false);
  const duracaoTotal = CONFIG[modo].min * 60;

  const hidratar = useCallback((historicoInicial: SessaoRow[], totalHojeInicial: number) => {
    if (hidratadoRef.current) return; // já tem estado ao vivo — não pisa nele
    hidratadoRef.current = true;
    setHistorico(historicoInicial);
    setFocoHoje(totalHojeInicial);
  }, []);

  const registrar = useCallback(
    async (tipo: Modo, dur: number) => {
      const inicio = inicioRef.current ? new Date(inicioRef.current) : new Date(Date.now() - dur * 1000);
      const { data, error } = await registrarSessaoFoco({
        projeto_id: projetoId || null,
        tipo,
        categoria,
        duracao_seg: dur,
        rotulo: rotulo.trim() || null,
        iniciada_em: inicio.toISOString(),
        finalizada_em: new Date().toISOString(),
      });
      if (!error && data) {
        setHistorico((prev) => [data as SessaoRow, ...prev]);
        if (tipo === "foco") setFocoHoje((h) => h + dur);
      }
    },
    [projetoId, rotulo, categoria],
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
      toast(`Sessão salva: ${formatDuracao(decorrido)} de ${CONFIG[modo].label.toLowerCase()}`);
    }
    inicioRef.current = null;
    setRestante(duracaoTotal);
  }

  return (
    <FocusTimerCtx.Provider
      value={{
        preset,
        modo,
        restante,
        duracaoTotal,
        rodando,
        projetoId,
        rotulo,
        categoria,
        historico,
        focoHoje,
        setProjetoId,
        setRotulo,
        setCategoria,
        trocarModo,
        trocarPreset,
        iniciarPausar,
        parar,
        hidratar,
      }}
    >
      {children}
    </FocusTimerCtx.Provider>
  );
}
