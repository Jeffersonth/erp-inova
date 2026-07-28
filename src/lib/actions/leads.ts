"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import { DEFAULT_ETAPAS } from "@/lib/etapas-padrao";

export type LeadRegistroInput = {
  data: string;
  canal_id: string;
  contatos: number;
  respostas: number;
  propostas: number;
  vendas: number;
  valor_vendido: number;
  observacoes: string | null;
};

export async function salvarLeadRegistro(id: string | null, input: LeadRegistroInput) {
  const supabase = createClient();

  if (id) {
    const { error } = await supabase.from("leads_registros").update(input).eq("id", id);
    if (error) return { data: null, error: "Não foi possível salvar o registro." };
    return { data: null, error: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("leads_registros")
    .insert({ ...input, user_id: user.id })
    .select("id, canal_id, data, contatos, respostas, propostas, vendas, valor_vendido, observacoes")
    .single();
  if (error || !data) return { data: null, error: "Não foi possível criar o registro." };
  return { data, error: null };
}

export async function excluirLeadRegistro(id: string) {
  const supabase = createClient();
  await supabase.from("leads_registros").delete().eq("id", id);
}

export type LeadMetaInput = {
  titulo: string;
  metrica: string;
  canal_id: string | null;
  alvo: number;
  mes: string;
};

export async function salvarLeadMeta(id: string | null, input: LeadMetaInput) {
  const supabase = createClient();

  if (id) {
    const { error } = await supabase.from("leads_metas").update(input).eq("id", id);
    if (error) return { data: null, error: "Não foi possível salvar a meta." };
    return { data: null, error: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada — faça login novamente." };

  const { data, error } = await supabase
    .from("leads_metas")
    .insert({ ...input, user_id: user.id })
    .select("id, canal_id, titulo, metrica, alvo, atual_manual, mes")
    .single();
  if (error || !data) return { data: null, error: "Não foi possível criar a meta." };
  return { data, error: null };
}

export async function excluirLeadMeta(id: string) {
  const supabase = createClient();
  await supabase.from("leads_metas").delete().eq("id", id);
}

export async function ajustarLeadMetaManual(id: string, novoValor: number) {
  const supabase = createClient();
  await supabase.from("leads_metas").update({ atual_manual: novoValor }).eq("id", id);
}

export type ConverterLeadInput = {
  nome: string;
  contato_nome: string | null;
  ramo: string | null;
  email: string | null;
  telefone: string | null;
  pais: string;
  status: Enums<"cliente_status">;
  origem: string;
  criarProjeto: boolean;
  tituloProjeto: string;
  valorProjeto: number | null;
  tarefaInicial: string;
};

/** Registra um lead/cliente da prospecção direto no CRM + projeto opcional com etapas padrão e tarefa inicial. */
export async function converterLead(input: ConverterLeadInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  // 1) contato no CRM com a origem registrada
  const { data: cliente, error: cliErr } = await supabase
    .from("clientes")
    .insert({
      user_id: user.id,
      nome: input.nome,
      contato_nome: input.contato_nome,
      ramo: input.ramo,
      email: input.email,
      telefone: input.telefone,
      pais: input.pais,
      status: input.status,
      origem: input.origem,
      ultima_interacao: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (cliErr || !cliente) return { error: "Não foi possível salvar no CRM." };

  // 2) rastro no histórico do contato (append-only)
  const convertido = input.status === "cliente" || input.status === "recorrente";
  await supabase.from("historico").insert({
    user_id: user.id,
    cliente_id: cliente.id,
    tipo: convertido ? "lead_convertido" : "lead_registrado",
    descricao: `${convertido ? "Convertido em cliente" : "Lead registrado"} a partir do canal ${input.origem.replace(/^Leads · /, "")} (módulo Leads).`,
    origem_ia: false,
  });

  // 3) projeto opcional com etapas padrão + tarefa inicial no quadro
  if (input.criarProjeto) {
    const { data: projeto } = await supabase
      .from("projetos")
      .insert({
        user_id: user.id,
        titulo: input.tituloProjeto,
        cliente_id: cliente.id,
        valor: input.valorProjeto,
        status: "briefing",
        progresso: 0,
      })
      .select("id")
      .single();
    if (projeto) {
      const { data: etapas } = await supabase
        .from("etapas")
        .insert(DEFAULT_ETAPAS.map((e) => ({ ...e, projeto_id: projeto.id })))
        .select("id, ordem");
      const primeira = (etapas ?? []).find((e) => e.ordem === 0) ?? (etapas ?? [])[0];
      if (primeira) {
        await supabase.from("tarefas").insert({
          user_id: user.id,
          projeto_id: projeto.id,
          etapa_id: primeira.id,
          titulo: input.tarefaInicial || `Kickoff com ${input.nome}`,
          tipo: "reuniao",
          ordem: 0,
        });
      }
    }
  } else if (input.tarefaInicial) {
    await supabase
      .from("tarefas_dia")
      .insert({ user_id: user.id, titulo: input.tarefaInicial, status: "pendente", ordem: 0 });
  }

  return { error: null };
}
