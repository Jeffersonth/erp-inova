"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/components/app-providers";
import {
  freshClock,
  remainingMs,
  restoreClock,
  toggleClock,
  totalSeconds,
  type FocusClock,
} from "@/lib/focus-clock";
import { SoftAlarm } from "@/lib/soft-alarm";
import {
  registrarSessaoFoco,
  type RegistrarSessaoFocoInput,
} from "@/lib/actions/tracker";
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

export const PRESETS: Record<
  Preset,
  {
    label: string;
    config: Record<Modo, { label: string; min: number; cor: string }>;
  }
> = {
  classico: {
    label: "25 + 5 min",
    config: {
      foco: { label: "Foco", min: 25, cor: "#C51E72" },
      pausa_curta: { label: "Pausa curta", min: 5, cor: "#0E9F6E" },
      pausa_longa: { label: "Pausa longa", min: 15, cor: "#FF7939" },
    },
  },
  estendido: {
    label: "50 + 10 min",
    config: {
      foco: { label: "Foco", min: 50, cor: "#C51E72" },
      pausa_curta: { label: "Descanso", min: 10, cor: "#0E9F6E" },
      pausa_longa: { label: "Pausa longa", min: 15, cor: "#FF7939" },
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
  hidratarHoje: (total: number) => void;
  sound: boolean;
  setSound: (value: boolean) => void;
  testarSom: () => void;
};

const FocusTimerCtx = createContext<Ctx | null>(null);

export function useFocusTimer() {
  const ctx = useContext(FocusTimerCtx);
  if (!ctx)
    throw new Error(
      "useFocusTimer deve ser usado dentro de <FocusTimerProvider>",
    );
  return ctx;
}

/** Relógio único, persistido neste navegador e independente dos intervalos de renderização. */
export function FocusTimerProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string;
}) {
  const { toast } = useApp();
  const key = `erp-focus-clock-v2:${userId}`;
  const [clock, setClock] = useState<FocusClock>(() => freshClock());
  const current = useRef(clock);
  const [now, setNow] = useState(Date.now());
  const ready = useRef(false);
  const pending = useRef<RegistrarSessaoFocoInput[]>([]);
  const busy = useRef(false);
  const saveFailed = useRef(false);
  const alarm = useRef<SoftAlarm | null>(null);
  const preview = useRef<SoftAlarm | null>(null);
  const [historico, setHistorico] = useState<SessaoRow[]>([]);
  const [focoHoje, setFocoHoje] = useState(0);
  const historySeeded = useRef(false);
  const todaySeeded = useRef(false);
  const persist = useCallback(() => {
    if (ready.current)
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ clock: current.current, pending: pending.current }),
        );
      } catch {}
  }, [key]);
  const commit = useCallback(
    (next: FocusClock) => {
      current.current = next;
      setClock(next);
      setNow(Date.now());
      persist();
    },
    [persist],
  );
  const flush = useCallback(async () => {
    if (busy.current || !pending.current.length || !navigator.onLine) return;
    busy.current = true;
    try {
      for (const record of [...pending.current]) {
        try {
          const result = await registrarSessaoFoco(record);
          const { data, error } = result;
          if (error || !data) {
            if (!saveFailed.current)
              toast(
                "Sessão guardada neste navegador. Vamos tentar salvar novamente.",
              );
            saveFailed.current = true;
            break;
          }
          saveFailed.current = false;
          pending.current = pending.current.filter((r) => r.id !== record.id);
          persist();
          setHistorico((prev) => [
            data as SessaoRow,
            ...prev.filter((r) => r.id !== data.id),
          ]);
          if ("totalHoje" in result && typeof result.totalHoje === "number") {
            todaySeeded.current = true;
            setFocoHoje(result.totalHoje);
          }
        } catch {
          break;
        }
      }
    } finally {
      busy.current = false;
    }
  }, [persist, toast]);
  const finish = useCallback(
    (manual: boolean) => {
      const s = current.current;
      const at = Date.now();
      if (!s.id || s.startedAt === null) return;
      const duration = manual
        ? Math.floor((totalSeconds(s) * 1000 - remainingMs(s, at)) / 1000)
        : totalSeconds(s);
      if (!manual || duration >= 60)
        pending.current.push({
          id: s.id,
          projeto_id: s.projetoId || null,
          tipo: s.modo,
          categoria: s.categoria,
          duracao_seg: duration,
          rotulo: s.rotulo.trim() || null,
          iniciada_em: new Date(s.startedAt).toISOString(),
          finalizada_em: new Date(
            !manual && s.deadline !== null ? s.deadline : at,
          ).toISOString(),
        });
      if (manual) alarm.current?.cancel();
      commit(freshClock(s));
      if (!manual)
        toast(
          s.modo === "foco"
            ? "✓ Sessão de foco concluída!"
            : "Pausa concluída — bora focar?",
        );
      else if (duration >= 60)
        toast(`Sessão encerrada: ${formatDuracao(duration)}`);
      void flush();
    },
    [commit, flush, toast],
  );
  useEffect(() => {
    const restore = (raw: string | null) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        const s = restoreClock(saved.clock);
        if (s) {
          current.current = s;
          setClock(s);
        }
        if (Array.isArray(saved.pending))
          pending.current = saved.pending
            .filter(
              (r: RegistrarSessaoFocoInput) =>
                r &&
                typeof r.id === "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  r.id,
                ) &&
                ["foco", "pausa_curta", "pausa_longa"].includes(r.tipo) &&
                ["trabalho", "estudo"].includes(r.categoria) &&
                typeof r.iniciada_em === "string" &&
                Number.isFinite(Date.parse(r.iniciada_em)) &&
                typeof r.finalizada_em === "string" &&
                Number.isFinite(Date.parse(r.finalizada_em)) &&
                (r.rotulo === null || typeof r.rotulo === "string") &&
                (r.projeto_id === null || typeof r.projeto_id === "string") &&
                Number.isInteger(r.duracao_seg) &&
                r.duracao_seg > 0 &&
                r.duracao_seg <= 10800,
            )
            .slice(0, 200);
      } catch {}
    };
    try {
      restore(localStorage.getItem(key));
    } catch {}
    ready.current = true;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (current.current.deadline !== null && current.current.deadline <= at)
        finish(false);
    };
    const wake = () => {
      tick();
      void flush();
    };
    const unlock = () => {
      const s = current.current;
      if (s.sound && s.deadline !== null && s.deadline > Date.now()) {
        alarm.current ??= new SoftAlarm();
        void alarm.current.arm(s.deadline);
      }
    };
    const sync = (event: StorageEvent) => {
      if (event.key === key) {
        const previous = current.current;
        restore(event.newValue);
        const s = current.current;
        if (s.deadline === null || !s.sound) {
          if (!s.sound || remainingMs(previous, Date.now()) > 0)
            alarm.current?.cancel();
        } else if (alarm.current) void alarm.current.arm(s.deadline);
        tick();
      }
    };
    tick();
    void flush();
    const interval = setInterval(tick, 1000);
    const retry = setInterval(() => void flush(), 30000);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", wake);
    document.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("pagehide", persist);
    return () => {
      clearInterval(interval);
      clearInterval(retry);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", wake);
      document.removeEventListener("pointerdown", unlock);
      window.removeEventListener("pagehide", persist);
      alarm.current?.dispose();
      preview.current?.dispose();
    };
  }, [key, finish, flush, persist]);
  const hidratar = useCallback((rows: SessaoRow[], total: number) => {
    if (!historySeeded.current) {
      historySeeded.current = true;
      setHistorico((prev) => [
        ...prev,
        ...rows.filter((r) => !prev.some((p) => p.id === r.id)),
      ]);
    }
    if (!todaySeeded.current) {
      todaySeeded.current = true;
      setFocoHoje(total);
    }
  }, []);
  const hidratarHoje = useCallback((total: number) => {
    if (!todaySeeded.current) {
      todaySeeded.current = true;
      setFocoHoje(total);
    }
  }, []);
  function iniciarPausar() {
    const s = current.current;
    if (s.deadline !== null && s.deadline <= Date.now()) {
      finish(false);
      return;
    }
    const next = toggleClock(s, Date.now(), crypto.randomUUID());
    commit(next);
    if (next.deadline !== null && next.sound) {
      alarm.current ??= new SoftAlarm();
      void alarm.current.arm(next.deadline);
    } else alarm.current?.cancel();
  }
  function trocarModo(m: Modo) {
    alarm.current?.cancel();
    commit(freshClock({ ...current.current, modo: m }));
  }
  function trocarPreset(p: Preset) {
    alarm.current?.cancel();
    commit(freshClock({ ...current.current, preset: p }));
  }
  function setSound(value: boolean) {
    commit({ ...current.current, sound: value });
    if (!value) alarm.current?.cancel();
    else if (current.current.deadline !== null) {
      alarm.current ??= new SoftAlarm();
      void alarm.current.arm(current.current.deadline);
    }
  }
  function testarSom() {
    preview.current ??= new SoftAlarm();
    void preview.current.arm(Date.now());
  }
  return (
    <FocusTimerCtx.Provider
      value={{
        preset: clock.preset,
        modo: clock.modo,
        restante: Math.ceil(remainingMs(clock, now) / 1000),
        duracaoTotal: totalSeconds(clock),
        rodando: clock.deadline !== null,
        projetoId: clock.projetoId,
        rotulo: clock.rotulo,
        categoria: clock.categoria,
        historico,
        focoHoje,
        setProjetoId: (v) => commit({ ...current.current, projetoId: v }),
        setRotulo: (v) => commit({ ...current.current, rotulo: v }),
        setCategoria: (v) => commit({ ...current.current, categoria: v }),
        trocarModo,
        trocarPreset,
        iniciarPausar,
        parar: () => finish(true),
        hidratar,
        hidratarHoje,
        sound: clock.sound,
        setSound,
        testarSom,
      }}
    >
      {children}
    </FocusTimerCtx.Provider>
  );
}
