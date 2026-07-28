"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type EventoInput = {
  titulo: string;
  tipo_ev: Enums<"evento_tipo">;
  quando: string;
  fim: string | null;
  dia_inteiro: boolean;
  local: string | null;
  notas: string | null;
  projeto_id: string | null;
};

export async function salvarEvento(id: string | null, input: EventoInput) {
  const supabase = createClient();

  if (id) {
    const { error } = await supabase.from("eventos_agenda").update(input).eq("id", id);
    if (error) return { data: null, error: "Não foi possível salvar o evento." };
    return { data: null, error: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("eventos_agenda")
    .insert({ ...input, user_id: user.id })
    .select("id, titulo, tipo_ev, quando, fim, dia_inteiro, local, notas, projeto_id")
    .single();
  if (error || !data) return { data: null, error: "Não foi possível criar o evento." };
  return { data, error: null };
}

export async function excluirEvento(id: string) {
  const supabase = createClient();
  await supabase.from("eventos_agenda").delete().eq("id", id);
}

export async function moverEvento(id: string, patch: { quando: string; fim: string | null }) {
  const supabase = createClient();
  await supabase.from("eventos_agenda").update(patch).eq("id", id);
}
