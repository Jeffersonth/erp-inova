"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type CriarTarefaDiaInput = {
  titulo: string;
  data_finalizar: string | null;
  ordem: number;
  status?: Enums<"tarefa_dia_status">;
};

export async function criarTarefaDia(input: CriarTarefaDiaInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("tarefas_dia")
    .insert({ user_id: user.id, status: "pendente", ...input })
    .select("id, titulo, status, data_finalizar, ordem")
    .single();
  if (error || !data) return { data: null, error: "Não foi possível adicionar a tarefa" };
  return { data, error: null };
}

export type TarefaDiaPatch = Partial<{
  status: Enums<"tarefa_dia_status">;
  concluida_em: string | null;
  titulo: string;
  data_finalizar: string | null;
  ordem: number;
}>;

export async function atualizarTarefaDia(id: string, patch: TarefaDiaPatch) {
  const supabase = createClient();
  await supabase.from("tarefas_dia").update(patch).eq("id", id);
}

export async function reordenarTarefasDia(itens: { id: string; ordem: number }[]) {
  const supabase = createClient();
  await Promise.all(itens.map((t) => supabase.from("tarefas_dia").update({ ordem: t.ordem }).eq("id", t.id)));
}

export async function excluirTarefaDia(id: string) {
  const supabase = createClient();
  await supabase.from("tarefas_dia").delete().eq("id", id);
}
