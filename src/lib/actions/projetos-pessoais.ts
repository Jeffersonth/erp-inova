"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PersonalProject } from "@/lib/personal-projects";
import { pool } from "@/lib/db/pool";

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
      !Array.isArray(input.notas) || input.notas.length > 100 ||
      input.notas.some(n => !n || !uuid.test(n.id) || typeof n.texto !== "string" || !n.texto.trim() || n.texto.length > 50000 || typeof n.concluida !== "boolean") ||
      new Set(input.notas.map(n => n.id)).size !== input.notas.length || !Array.isArray(input.etapas) || input.etapas.length > 100 ||
      input.etapas.some(e => !e || !uuid.test(e.id) || typeof e.titulo !== "string" || !e.titulo.trim() || e.titulo.length > 200 || typeof e.concluida !== "boolean" || typeof e.prazo !== "string" || !validDate(e.prazo)) ||
      new Set(input.etapas.map(e => e.id)).size !== input.etapas.length) {
    return { error: "Confira o título, as etapas e os prazos informados." };
  }
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const { error } = await db.from("projetos_pessoais").upsert({
    id: input.id, user_id: user.id, titulo: input.titulo.trim(), categoria: input.categoria,
    prazo: input.prazo || null, notas: JSON.stringify(input.notas.map(n => ({ id: n.id, texto: n.texto.trim(), concluida: n.concluida }))),
    etapas: JSON.stringify(input.etapas.map(e => ({ ...e, titulo: e.titulo.trim() }))),
  }, { onConflict: "id" });
  if (error) return { error: "Não foi possível salvar. Suas alterações continuam no formulário; tente novamente." };
  revalidatePath("/projetos-pessoais");
  return { error: null };
}

// Atualiza somente o item marcado, sem sobrescrever os outros itens do projeto.
export async function marcarItemPessoal(projetoId: string, tipo: "etapas" | "notas", itemId: string, concluida: boolean) {
  if (!uuid.test(projetoId) || !uuid.test(itemId) || !["etapas", "notas"].includes(tipo) || typeof concluida !== "boolean") {
    return { error: "Item inválido." };
  }
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [user.id]);
    const result = await client.query(
      `update projetos_pessoais set ${tipo} = (
        select jsonb_agg(case when item->>'id' = $2
          then jsonb_set(item, '{concluida}', to_jsonb($3::boolean)) else item end order by ordem)
        from jsonb_array_elements(${tipo}) with ordinality as itens(item, ordem)
      ) where id = $1 and user_id = $4
        and exists (select 1 from jsonb_array_elements(${tipo}) item where item->>'id' = $2)
      returning id`, [projetoId, itemId, concluida, user.id]);
    await client.query("commit");
    if (!result.rowCount) return { error: "Item não encontrado. Atualize a página." };
    revalidatePath("/projetos-pessoais");
    return { error: null };
  } catch {
    await client.query("rollback");
    return { error: "Não foi possível salvar a conclusão. Tente novamente." };
  } finally { client.release(); }
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
