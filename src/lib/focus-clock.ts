export type ClockMode = "foco" | "pausa_curta" | "pausa_longa";
export type ClockPreset = "classico" | "estendido";
export type FocusClock = {
  preset: ClockPreset;
  modo: ClockMode;
  remainingMs: number;
  deadline: number | null;
  startedAt: number | null;
  id: string | null;
  projetoId: string;
  rotulo: string;
  categoria: "trabalho" | "estudo";
  sound: boolean;
};
export function totalSeconds(s: Pick<FocusClock, "preset" | "modo">) {
  return (
    (s.modo === "pausa_longa"
      ? 15
      : s.modo === "foco"
        ? s.preset === "estendido"
          ? 50
          : 25
        : s.preset === "estendido"
          ? 10
          : 5) * 60
  );
}
export function freshClock(previous: Partial<FocusClock> = {}): FocusClock {
  const s: FocusClock = {
    preset: "classico",
    modo: "foco",
    remainingMs: 1500000,
    deadline: null,
    startedAt: null,
    id: null,
    projetoId: "",
    rotulo: "",
    categoria: "trabalho",
    sound: true,
    ...previous,
  };
  return {
    ...s,
    remainingMs: totalSeconds(s) * 1000,
    deadline: null,
    startedAt: null,
    id: null,
  };
}
export const remainingMs = (s: FocusClock, now: number) =>
  Math.max(0, s.deadline === null ? s.remainingMs : s.deadline - now);
export function toggleClock(
  s: FocusClock,
  now: number,
  id: string,
): FocusClock {
  if (s.deadline !== null)
    return { ...s, remainingMs: remainingMs(s, now), deadline: null };
  return {
    ...s,
    startedAt: s.startedAt ?? now,
    id: s.id ?? id,
    deadline: now + s.remainingMs,
  };
}
export function restoreClock(value: unknown): FocusClock | null {
  if (!value || typeof value !== "object") return null;
  const s = value as FocusClock;
  if (
    !["classico", "estendido"].includes(s.preset) ||
    !["foco", "pausa_curta", "pausa_longa"].includes(s.modo) ||
    !["trabalho", "estudo"].includes(s.categoria) ||
    typeof s.sound !== "boolean" ||
    typeof s.projetoId !== "string" ||
    typeof s.rotulo !== "string" ||
    s.rotulo.length > 2000 ||
    !Number.isFinite(s.remainingMs) ||
    s.remainingMs < 0 ||
    s.remainingMs > totalSeconds(s) * 1000
  )
    return null;
  if (s.deadline !== null && (!Number.isFinite(s.deadline) || s.deadline <= 0))
    return null;
  if (
    s.startedAt !== null &&
    (!Number.isFinite(s.startedAt) || s.startedAt <= 0)
  )
    return null;
  if (
    s.id !== null &&
    (typeof s.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        s.id,
      ))
  )
    return null;
  if (
    (s.deadline !== null || s.startedAt !== null || s.id !== null) &&
    (!s.id || s.startedAt === null)
  )
    return null;
  return s;
}
