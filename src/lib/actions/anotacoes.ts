"use server";

import { createClient } from "@/lib/supabase/server";

export type CriarAnotacaoInput = {
  texto: string;
  tag: string | null;
  due: string | null;
  detected_by_ia: boolean;
};

export async function criarAnotacao(input: CriarAnotacaoInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("anotacoes")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error || !data) return { data: null, error: "Não foi possível salvar a anotação." };
  return { data, error: null };
}

export async function atualizarAnotacao(id: string, concluida: boolean) {
  const supabase = createClient();
  await supabase.from("anotacoes").update({ concluida }).eq("id", id);
}

export async function excluirAnotacao(id: string) {
  const supabase = createClient();
  await supabase.from("anotacoes").delete().eq("id", id);
}
