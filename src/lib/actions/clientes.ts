"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type ClienteInput = {
  nome: string;
  contato_nome: string | null;
  email: string | null;
  telefone: string | null;
  pais: string;
  ramo: string | null;
  status: Enums<"cliente_status">;
};

export async function criarCliente(input: ClienteInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const { error } = await supabase.from("clientes").insert({ user_id: user.id, ...input });
  if (error) return { error: "Não foi possível salvar o contato." };

  revalidatePath("/crm");
  return { error: null };
}

export async function atualizarCliente(id: string, input: ClienteInput) {
  const supabase = createClient();
  const { error } = await supabase.from("clientes").update(input).eq("id", id);
  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/crm");
  return { error: null };
}

export async function excluirCliente(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o contato." };

  revalidatePath("/crm");
  return { error: null };
}
