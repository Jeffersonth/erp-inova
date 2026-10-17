"use server";
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import { parseRegraTopicos, regraUuid } from "@/lib/regras";

async function mutate(run: (db: PoolClient, userId: string) => Promise<void>) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return { error: "Sessão encerrada. Entre novamente." };
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('app.user_id',$1,true)",[user.id]);
    await run(db,user.id);
    await db.query("commit"); revalidatePath("/regras"); return { error: null };
  } catch (error) {
    await db.query("rollback");
    const code = (error as { code?: string }).code;
    return { error: code === "23505" ? "Já existe uma categoria com esse nome." : code === "23503" ? "Exclua ou mova as regras antes de excluir a categoria." : "Não foi possível salvar. Atualize a página e tente novamente." };
  } finally { db.release(); }
}
export async function salvarRegraCategoria(id: string | null, nome: string) {
  if ((id !== null && !regraUuid.test(id)) || typeof nome !== "string" || !nome.trim() || nome.trim().length > 100) return { error: "Informe um nome de categoria com até 100 caracteres." };
  return mutate(async (db,user) => {
    const result = id ? await db.query("update regras_categorias set nome=$1 where id=$2 and user_id=$3 returning id",[nome.trim(),id,user]) : await db.query("insert into regras_categorias(user_id,nome,ordem) select $1,$2,coalesce(max(ordem),-1)+1 from regras_categorias where user_id=$1 returning id",[user,nome.trim()]);
    if (!result.rowCount) throw new Error("Categoria não encontrada");
  });
}
export async function excluirRegraCategoria(id: string) {
  if (!regraUuid.test(id)) return { error: "Categoria inválida." };
  return mutate(async (db,user) => { if (!(await db.query("delete from regras_categorias where id=$1 and user_id=$2 returning id",[id,user])).rowCount) throw new Error("Categoria não encontrada"); });
}
export async function adicionarRegras(categoriaId: string, text: string) {
  const topics = parseRegraTopicos(text);
  if (!regraUuid.test(categoriaId) || !topics) return { error: "Escreva uma regra por linha, até 50 por envio e 2.000 caracteres por regra." };
  return mutate(async (db,user) => {
    if (!(await db.query("select id from regras_categorias where id=$1 and user_id=$2 for update",[categoriaId,user])).rowCount) throw new Error("Categoria inválida");
    const start = Number((await db.query("select coalesce(max(ordem),-1)+1 as next from regras where categoria_id=$1 and user_id=$2",[categoriaId,user])).rows[0].next);
    await db.query("insert into regras(user_id,categoria_id,texto,ordem) select $1,$2,item,($4::integer+position-1)::integer from unnest($3::text[]) with ordinality as topics(item,position)",[user,categoriaId,topics,start]);
  });
}
export async function atualizarRegra(id: string, categoriaId: string, texto: string) {
  if (!regraUuid.test(id) || !regraUuid.test(categoriaId) || typeof texto !== "string" || !texto.trim() || texto.trim().length > 2000) return { error: "Informe uma regra com até 2.000 caracteres." };
  return mutate(async (db,user) => {
    if (!(await db.query("select id from regras_categorias where id=$1 and user_id=$2",[categoriaId,user])).rowCount) throw new Error("Categoria inválida");
    if (!(await db.query("update regras set texto=$1,categoria_id=$2 where id=$3 and user_id=$4 returning id",[texto.trim(),categoriaId,id,user])).rowCount) throw new Error("Regra não encontrada");
  });
}
export async function excluirRegra(id: string) {
  if (!regraUuid.test(id)) return { error: "Regra inválida." };
  return mutate(async (db,user) => { if (!(await db.query("delete from regras where id=$1 and user_id=$2 returning id",[id,user])).rowCount) throw new Error("Regra não encontrada"); });
}
