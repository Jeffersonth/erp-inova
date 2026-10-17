"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PersonalProject } from "@/lib/personal-projects";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validDate(value: unknown): boolean {
  if (value === null || value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function salvarProjetoPessoal(input: PersonalProject) {
  if (!input || !uuid.test(input.id) || typeof input.titulo !== "string" || !input.titulo.trim() || input.titulo.trim().length > 200 ||
      !["Aplicativo", "Site", "Outro"].includes(input.categoria) || !validDate(input.prazo) ||
      typeof input.anotacoes !== "string" || input.anotacoes.length > 50000 || !Array.isArray(input.etapas) || input.etapas.length > 100 ||
      input.etapas.some(e => !e || !uuid.test(e.id) || typeof e.titulo !== "string" || !e.titulo.trim() || e.titulo.length > 200 || typeof e.concluida !== "boolean" || typeof e.prazo !== "string" || !validDate(e.prazo)) ||
      new Set(input.etapas.map(e => e.id)).size !== input.etapas.length) {
    return { error: "Confira o título, as etapas e os prazos informados." };
  }
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const { error } = await db.from("projetos_pessoais").upsert({
    id: input.id, user_id: user.id, titulo: input.titulo.trim(), categoria: input.categoria,
    prazo: input.prazo || null, anotacoes: input.anotacoes,
    etapas: JSON.stringify(input.etapas.map(e => ({ ...e, titulo: e.titulo.trim() }))),
  }, { onConflict: "id" });
  if (error) return { error: "Não foi possível salvar. Suas alterações continuam no formulário; tente novamente." };
  revalidatePath("/projetos-pessoais");
  return { error: null };
}

export async function excluirProjetoPessoal(id: string) {
  if (!uuid.test(id)) return { error: "Projeto inválido." };
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const { error } = await db.from("projetos_pessoais").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Não foi possível excluir o projeto." };
  revalidatePath("/projetos-pessoais");
  return { error: null };
}
