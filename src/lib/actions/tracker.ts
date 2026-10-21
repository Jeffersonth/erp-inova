"use server";

import { createClient } from "@/lib/supabase/server";
import { agendaDate } from "@/lib/agenda-items";
import { revalidatePath } from "next/cache";

export type RegistrarSessaoFocoInput = {
  id?: string;
  projeto_id: string | null;
  tipo: "foco" | "pausa_curta" | "pausa_longa";
  categoria: string;
  duracao_seg: number;
  rotulo: string | null;
  iniciada_em: string;
  finalizada_em: string;
};

/** Usado tanto pelo mini-pomodoro da Central de Trabalho quanto pelo Time Tracker completo. */
export async function registrarSessaoFoco(input: RegistrarSessaoFocoInput) {
  if (
    input.id !== undefined &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.id,
    )
  )
    return { data: null, error: "Sessão inválida." };
  if (
    !Number.isInteger(input.duracao_seg) ||
    input.duracao_seg < 1 ||
    input.duracao_seg > 10800 ||
    !["foco", "pausa_curta", "pausa_longa"].includes(input.tipo) ||
    !["trabalho", "estudo"].includes(input.categoria) ||
    !Number.isFinite(Date.parse(input.iniciada_em)) ||
    !Number.isFinite(Date.parse(input.finalizada_em)) ||
    Date.parse(input.finalizada_em) < Date.parse(input.iniciada_em)
  )
    return { data: null, error: "Dados da sessão inválidos." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { data: null, error: "Sessão expirada — faça login novamente." };

  const values = { ...input, user_id: user.id };
  const query = supabase.from("sessoes_foco");
  const { data, error } = await (
    input.id ? query.upsert(values, { onConflict: "id" }) : query.insert(values)
  )
    .select(
      "id, tipo, categoria, duracao_seg, rotulo, finalizada_em, projetos(titulo)",
    )
    .single();
  if (error || !data)
    return { data: null, error: "Não foi possível salvar a sessão." };
  const today = agendaDate();
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const totals = await supabase
    .from<{ duracao_seg: number }>("sessoes_foco")
    .select("duracao_seg")
    .eq("tipo", "foco")
    .gte("finalizada_em", `${today}T00:00:00-03:00`)
    .lt(
      "finalizada_em",
      `${tomorrow.toISOString().slice(0, 10)}T00:00:00-03:00`,
    );
  for (const path of ["/tracker", "/hoje", "/dashboard"]) revalidatePath(path);
  return {
    data,
    error: null,
    totalHoje: totals.error
      ? null
      : (totals.data ?? []).reduce(
          (sum, row) => sum + Number(row.duracao_seg),
          0,
        ),
  };
}
