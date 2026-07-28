"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import { DEFAULT_ETAPAS } from "@/lib/etapas-padrao";
import type { TarefaTipo } from "@/lib/tarefa-tipos";

export type NovoProjetoInput = {
  titulo: string;
  cliente_id: string | null;
  valor: number | null;
  moeda: Enums<"moeda">;
  data_entrega: string | null;
  cards: { titulo: string; tipo: TarefaTipo }[];
};

export async function criarProjeto(input: NovoProjetoInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente.", projetoId: null };

  const { data: projeto, error: insertError } = await supabase
    .from("projetos")
    .insert({
      user_id: user.id,
      titulo: input.titulo,
      cliente_id: input.cliente_id,
      valor: input.valor,
      moeda: input.moeda,
      status: "briefing",
      progresso: 0,
    })
    .select("id")
    .single();
  if (insertError || !projeto) {
    return { error: "Não foi possível salvar o projeto.", projetoId: null };
  }

  const { data: etapas, error: etapaError } = await supabase
    .from("etapas")
    .insert(DEFAULT_ETAPAS.map((e) => ({ ...e, projeto_id: projeto.id })))
    .select("id, ordem, nome");
  if (etapaError || !etapas) {
    return { error: "Projeto criado, mas houve erro ao criar as etapas.", projetoId: projeto.id as string };
  }

  if (input.data_entrega) {
    await supabase.from("projetos").update({ data_entrega: input.data_entrega }).eq("id", projeto.id);
  }

  if (input.cards.length > 0) {
    const primeira = etapas.find((e) => e.ordem === 0) ?? etapas[0];
    await supabase.from("tarefas").insert(
      input.cards.map((c, i) => ({
        user_id: user.id,
        projeto_id: projeto.id,
        etapa_id: primeira.id,
        titulo: c.titulo,
        tipo: c.tipo,
        ordem: i,
      })),
    );
  }

  return { error: null, projetoId: projeto.id as string };
}

export type EditarProjetoInput = {
  titulo: string;
  cliente_id: string | null;
  valor: number | null;
  moeda: Enums<"moeda">;
  data_entrega: string | null;
};

export async function atualizarProjeto(id: string, input: EditarProjetoInput) {
  const supabase = createClient();
  const { error } = await supabase.from("projetos").update(input).eq("id", id);
  return { error: error ? "Não foi possível salvar as alterações." : null };
}

export async function excluirProjeto(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("projetos").delete().eq("id", id);
  return { error: error ? "Não foi possível excluir o projeto." : null };
}

export async function atualizarStatusProjeto(id: string, status: Enums<"projeto_status">) {
  const supabase = createClient();
  await supabase.from("projetos").update({ status }).eq("id", id);
}

export async function atualizarProgressoProjeto(id: string, progresso: number) {
  const supabase = createClient();
  await supabase.from("projetos").update({ progresso }).eq("id", id);
}

// --- board (etapas/cards dentro de um projeto) ---

export type CriarTarefaBoardInput = {
  projeto_id: string;
  etapa_id: string;
  titulo: string;
  tipo: TarefaTipo;
  ordem: number;
  concluida: boolean;
};

export async function criarTarefaBoard(input: CriarTarefaBoardInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("tarefas")
    .insert({ user_id: user.id, ...input })
    .select("id, titulo, descricao, tipo, concluida, ordem")
    .single();
  if (error || !data) return { data: null, error: "Não foi possível adicionar o card" };
  return { data, error: null };
}

export type TarefaBoardPatch = Partial<{
  concluida: boolean;
  etapa_id: string;
  titulo: string;
  tipo: TarefaTipo;
  descricao: string | null;
}>;

export async function atualizarTarefaBoard(id: string, patch: TarefaBoardPatch) {
  const supabase = createClient();
  await supabase.from("tarefas").update(patch).eq("id", id);
}

export async function excluirTarefaBoard(id: string) {
  const supabase = createClient();
  await supabase.from("tarefas").delete().eq("id", id);
}

export async function criarEtapa(projetoId: string, nome: string, ordem: number) {
  const supabase = createClient();
  const { error } = await supabase.from("etapas").insert({ projeto_id: projetoId, nome, ordem, final: false });
  return { error: error ? "Não foi possível criar a etapa" : null };
}

export async function renomearEtapa(etapaId: string, nome: string) {
  const supabase = createClient();
  await supabase.from("etapas").update({ nome }).eq("id", etapaId);
}

export async function excluirEtapa(etapaId: string) {
  const supabase = createClient();
  await supabase.from("etapas").delete().eq("id", etapaId);
}

// --- notas do projeto ---

export async function criarProjetoNota(projetoId: string, texto: string, prioridade: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("projeto_notas")
    .insert({ user_id: user.id, projeto_id: projetoId, texto, prioridade })
    .select("id, texto, prioridade")
    .single();
  if (error || !data) return { data: null, error: "Não foi possível salvar a anotação." };
  return { data, error: null };
}

export async function atualizarProjetoNota(id: string, prioridade: boolean) {
  const supabase = createClient();
  await supabase.from("projeto_notas").update({ prioridade }).eq("id", id);
}

export async function excluirProjetoNota(id: string) {
  const supabase = createClient();
  await supabase.from("projeto_notas").delete().eq("id", id);
}
