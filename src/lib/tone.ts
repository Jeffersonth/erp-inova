export type Tone = "ok" | "amber" | "danger" | "brand" | "mut";

export const toneText: Record<Tone, string> = {
  ok: "text-ok",
  amber: "text-warn",
  danger: "text-danger",
  brand: "text-brand",
  mut: "text-mut",
};

export const scorePill: Record<Tone, string> = {
  ok: "text-ok",
  amber: "text-warn",
  danger: "text-danger",
  brand: "text-brand",
  mut: "text-mut",
};

// pílula de risco (fundo suave + borda + texto)
export const riskPill: Record<Tone, string> = {
  ok: "text-ok border-ok/35 bg-ok/[.08]",
  amber: "text-warn border-warn/35 bg-warn/[.08]",
  danger: "text-danger border-danger/40 bg-danger/[.08]",
  brand: "text-brand border-brand/35 bg-brand/[.08]",
  mut: "text-mut border-line bg-soft",
};
