"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pool } from "@/lib/db/pool";
import { rotinaInputValido, type RotinaInput } from "@/lib/rotina";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function salvarRotinaItem(id: string | null, input: RotinaInput) {
  if ((id!==null&&!uuid.test(id)) || !rotinaInputValido(input)) return { error: "Confira o título, o horário e selecione pelo menos um dia da semana." };
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return { error: "Sessão encerrada. Entre novamente." };
  const db = await pool.connect();
  try {
    await db.query("begin"); await db.query("select set_config('app.user_id',$1,true)",[user.id]);
    const values = [input.tipo,input.titulo.trim(),input.horario,[...input.dias].sort((a,b)=>a-b),input.descricao,user.id];
    const result = id ? await db.query("update rotina_itens set tipo=$1,titulo=$2,horario=$3,dias=$4,descricao=$5 where user_id=$6 and id=$7 returning id",[...values,id]) : await db.query("insert into rotina_itens(tipo,titulo,horario,dias,descricao,user_id,ordem) select $1,$2,$3,$4,$5,$6,coalesce(max(ordem),-1)+1 from rotina_itens where user_id=$6 returning id",values);
    if (!result.rowCount) throw new Error("Item não encontrado");
    await db.query("commit"); revalidatePath("/rotina-dieta"); return { error: null };
  } catch { await db.query("rollback"); return { error: "Não foi possível salvar. Suas alterações continuam no formulário." }; }
  finally { db.release(); }
}
export async function excluirRotinaItem(id: string) {
  if (!uuid.test(id)) return { error: "Item inválido." };
  const db = createClient(); const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Sessão encerrada. Entre novamente." };
  const { error } = await db.from("rotina_itens").delete().eq("id",id).eq("user_id",user.id).select("id").single();
  if (error) return { error: "Não foi possível excluir. Atualize a página e tente novamente." };
  revalidatePath("/rotina-dieta"); return { error: null };
}
