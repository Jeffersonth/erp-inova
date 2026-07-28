"use server";

import { createClient } from "@/lib/supabase/server";

export type AtualizarPerfilInput = Partial<{
  nome: string;
  telefone: string | null;
  funcao: string | null;
  meta_horas_dia: number;
  avatar_url: string;
}>;

export async function atualizarPerfil(id: string, input: AtualizarPerfilInput) {
  const supabase = createClient();
  const { error } = await supabase.from("usuarios").update(input).eq("id", id);
  return { error: error ? "Não foi possível salvar o perfil." : null };
}
