import type { Enums } from "@/lib/supabase/database.types";

export type TarefaTipo = Enums<"tarefa_tipo">;

export type TipoMeta = {
  label: string;
  color: string; // cor sólida (dot/legenda)
  text: string; // cor do texto na pill
  tint: string; // fundo sutil do card
  border: string; // borda do card
};

/** Metadados visuais de cada tipo de tarefa — cores no espírito da paleta Inova Labs. */
export const TIPO_META: Record<TarefaTipo, TipoMeta> = {
  dev: { label: "Dev", color: "#1D5BFF", text: "#1848CC", tint: "rgba(29,91,255,.07)", border: "rgba(29,91,255,.28)" },
  design: { label: "Design", color: "#7A5AF8", text: "#5B3FD1", tint: "rgba(122,90,248,.09)", border: "rgba(122,90,248,.30)" },
  conteudo: { label: "Conteúdo", color: "#0E9F6E", text: "#0B7D57", tint: "rgba(14,159,110,.09)", border: "rgba(14,159,110,.30)" },
  reuniao: { label: "Reunião", color: "#C77700", text: "#A66300", tint: "rgba(199,119,0,.09)", border: "rgba(199,119,0,.30)" },
  bug: { label: "Bug", color: "#E5484D", text: "#C0362B", tint: "rgba(229,72,77,.08)", border: "rgba(229,72,77,.30)" },
};

export const TIPO_ORDER: TarefaTipo[] = ["dev", "design", "conteudo", "reuniao", "bug"];
