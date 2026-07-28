"use server";

import { createClient } from "@/lib/supabase/server";

export type RegistrarSessaoFocoInput = {
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("sessoes_foco")
    .insert({ user_id: user.id, ...input })
    .select("id, tipo, categoria, duracao_seg, rotulo, finalizada_em, projetos(titulo)")
    .single();
  if (error || !data) return { data: null, error: "Não foi possível salvar a sessão." };
  return { data, error: null };
}
