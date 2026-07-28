"use server";

import { createClient } from "@/lib/supabase/server";

export type ArquivoRow = { id: string; nome: string; storage_path: string; classificacao_ia: string | null };

export async function listarArquivos(scope: "cliente" | "projeto", ownerId: string): Promise<ArquivoRow[]> {
  const supabase = createClient();
  const coluna = scope === "cliente" ? "cliente_id" : "projeto_id";
  const { data } = await supabase
    .from("arquivos")
    .select("id, nome, storage_path, classificacao_ia")
    .eq(coluna, ownerId)
    .order("created_at", { ascending: false });
  return (data as ArquivoRow[]) ?? [];
}

export type CriarArquivoInput = {
  scope: "cliente" | "projeto";
  ownerId: string;
  nome: string;
  storage_path: string;
  classificacao_ia: string;
};

export async function criarArquivo(input: CriarArquivoInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("arquivos")
    .insert({
      user_id: user.id,
      cliente_id: input.scope === "cliente" ? input.ownerId : null,
      projeto_id: input.scope === "projeto" ? input.ownerId : null,
      nome: input.nome,
      storage_path: input.storage_path,
      classificacao_ia: input.classificacao_ia,
    })
    .select("id, nome, storage_path, classificacao_ia")
    .single();
  if (error || !data) return { data: null, error: "Não foi possível registrar o arquivo." };
  return { data, error: null };
}

export async function excluirArquivo(id: string) {
  const supabase = createClient();
  await supabase.from("arquivos").delete().eq("id", id);
}
