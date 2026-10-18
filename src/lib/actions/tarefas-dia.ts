"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Enums } from "@/lib/supabase/database.types";

export type CriarTarefaDiaInput = {
  titulo: string;
  descricao?: string;
  data_finalizar: string | null;
  ordem: number;
  status?: Enums<"tarefa_dia_status">;
};

export async function criarTarefaDia(input: CriarTarefaDiaInput) {
  if (
    typeof input.titulo !== "string" ||
    !input.titulo.trim() ||
    (input.descricao !== undefined &&
      (typeof input.descricao !== "string" || input.descricao.length > 500))
  )
    return {
      data: null,
      error: "Informe o título e uma descrição de até 500 caracteres.",
    };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("tarefas_dia")
    .insert({
      user_id: user.id,
      status: input.status ?? "pendente",
      titulo: input.titulo.trim(),
      descricao: input.descricao?.trim() ?? "",
      data_finalizar: input.data_finalizar,
      ordem: input.ordem,
    })
    .select("id, titulo, descricao, status, data_finalizar, ordem")
    .single();
  if (error || !data)
    return { data: null, error: "Não foi possível adicionar a tarefa" };
  refresh();
  return { data, error: null };
}

export type TarefaDiaPatch = Partial<{
  status: Enums<"tarefa_dia_status">;
  concluida_em: string | null;
  titulo: string;
  descricao: string;
  data_finalizar: string | null;
  ordem: number;
}>;

export async function atualizarTarefaDia(id: string, patch: TarefaDiaPatch) {
  if (
    (patch.titulo !== undefined &&
      (typeof patch.titulo !== "string" || !patch.titulo.trim())) ||
    (patch.descricao !== undefined &&
      (typeof patch.descricao !== "string" || patch.descricao.length > 500))
  )
    return { error: "Informe o título e uma descrição de até 500 caracteres." };
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_dia")
    .update({
      ...patch,
      ...(patch.descricao !== undefined
        ? { descricao: patch.descricao.trim() }
        : {}),
    })
    .eq("id", id)
    .select("id")
    .single();
  if (error)
    return { error: "Não foi possível salvar a tarefa. Tente novamente." };
  refresh();
  return { error: null };
}

export async function reordenarTarefasDia(
  itens: { id: string; ordem: number }[],
) {
  const supabase = createClient();
  await Promise.all(
    itens.map((t) =>
      supabase.from("tarefas_dia").update({ ordem: t.ordem }).eq("id", t.id),
    ),
  );
}

export async function excluirTarefaDia(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("tarefas_dia")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error)
    return { error: "Não foi possível excluir a tarefa. Tente novamente." };
  refresh();
  return { error: null };
}

function refresh() {
  for (const path of ["/tarefas", "/hoje", "/dashboard", "/agenda"])
    revalidatePath(path);
}
