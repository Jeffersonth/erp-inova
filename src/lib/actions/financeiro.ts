"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

export type CustoInput = {
  descricao: string;
  categoria: string | null;
  valor: number;
  data: string;
  recorrente: boolean;
  cliente_id: string | null;
};

export async function salvarCusto(id: string | null, input: CustoInput) {
  const supabase = createClient();

  if (id) {
    const { error } = await supabase.from("custos").update(input).eq("id", id);
    return { error: error ? "Não foi possível salvar a despesa." : null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const { error } = await supabase.from("custos").insert({ ...input, user_id: user.id });
  return { error: error ? "Não foi possível registrar a despesa." : null };
}

export async function excluirCusto(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("custos").delete().eq("id", id);
  return { error: error ? "Não foi possível excluir a despesa." : null };
}

export type RecebimentoInput = {
  cliente_id: string | null;
  projeto_id: string | null;
  descricao: string | null;
  valor: number;
  valor_pago: number;
  moeda: Enums<"moeda">;
  data_pagamento: string | null;
  status: Enums<"recebimento_status">;
};

export async function salvarRecebimento(id: string | null, input: RecebimentoInput) {
  const supabase = createClient();

  if (id) {
    const { error } = await supabase.from("recebimentos").update(input).eq("id", id);
    if (!error) { revalidatePath("/agenda"); revalidatePath("/hoje"); }
    return { error: error ? "Não foi possível salvar a venda." : null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const { error } = await supabase.from("recebimentos").insert({ ...input, user_id: user.id });
  if (!error) { revalidatePath("/agenda"); revalidatePath("/hoje"); }
  return { error: error ? "Não foi possível registrar a venda." : null };
}

export async function excluirRecebimento(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("recebimentos").delete().eq("id", id);
  if (!error) { revalidatePath("/agenda"); revalidatePath("/hoje"); }
  return { error: error ? "Não foi possível excluir a venda." : null };
}

export async function salvarMetaFinanceira(mesIso: string, valorMeta: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const { error } = await supabase
    .from("metas_financeiras")
    .upsert({ user_id: user.id, mes: mesIso, valor_meta: valorMeta }, { onConflict: "user_id,mes" });
  return { error: error ? "Não foi possível salvar a meta." : null };
}
