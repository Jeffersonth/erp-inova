"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import { validAgendaDate } from "@/lib/agenda-items";
import { CONVERSA_STATUS, isWorkana, type AtividadeCanal, type ConversaLead } from "@/lib/prospeccao";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const count = (value: number) => Number.isInteger(value) && value >= 0 && value <= 1000000;
function refresh() { for (const path of ["/prospeccao", "/leads", "/dashboard", "/crm", "/hoje"]) revalidatePath(path); }

export async function registrarAtividades(data: string, rows: AtividadeCanal[], observacoes: string) {
  if (!validAgendaDate(data) || !Array.isArray(rows) || !rows.length || rows.length > 30 || typeof observacoes !== "string" || observacoes.length > 5000 ||
    rows.some(r => !r || !uuid.test(r.canal_id) || !count(r.contatos) || !count(r.propostas) || !count(r.respostas)) || new Set(rows.map(r => r.canal_id)).size !== rows.length) return { error: "Confira a data e as quantidades. Use números inteiros a partir de zero." };
  const active = rows.filter(r => r.contatos || r.propostas || r.respostas);
  if (!active.length) return { error: "Preencha a atividade de pelo menos um canal." };
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const db = await pool.connect();
  try {
    await db.query("begin"); await db.query("select set_config('app.user_id', $1, true)", [user.id]);
    const canais = await db.query<{ id: string; nome: string }>("select id,nome from leads_canais where user_id=$1 and id=any($2::uuid[])", [user.id, active.map(r => r.canal_id)]);
    if (canais.rowCount !== active.length) throw new Error("Canal inválido.");
    for (const row of active) {
      const canal = canais.rows.find(c => c.id === row.canal_id)!;
      const contatos = isWorkana(canal.nome) ? Math.max(row.contatos, row.propostas) : row.contatos;
      await db.query("insert into leads_registros(user_id,canal_id,data,contatos,propostas,respostas,observacoes) values($1,$2,$3,$4,$5,$6,$7)", [user.id, row.canal_id, data, contatos, row.propostas, row.respostas, observacoes.trim() || null]);
    }
    await db.query("commit"); refresh(); return { error: null };
  } catch { await db.query("rollback"); return { error: "Não foi possível salvar as atividades. Nenhum registro deste envio foi gravado." }; }
  finally { db.release(); }
}

export type ConversaInput = Omit<ConversaLead, "id" | "cliente_id">;
export async function salvarConversa(id: string | null, input: ConversaInput) {
  if (!input || (id !== null && !uuid.test(id)) || typeof input.nome !== "string" || !input.nome.trim() || input.nome.length > 200 || !uuid.test(input.canal_id) ||
    !Object.hasOwn(CONVERSA_STATUS, input.status) || (!id && input.status === "convertido") || typeof input.notas !== "string" || input.notas.length > 20000 ||
    !validAgendaDate(input.ultimo_contato) || (input.proximo_contato !== null && !validAgendaDate(input.proximo_contato)) ||
    [input.contato,input.email,input.telefone].some(s => s !== null && (typeof s !== "string" || s.length > 300)) ||
    (input.email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) ||
    (input.valor_potencial !== null && (typeof input.valor_potencial !== "number" || !Number.isFinite(input.valor_potencial) || input.valor_potencial < 0 || input.valor_potencial > 9999999999.99))) return { error: "Confira o nome, o canal, as datas e os dados de contato." };
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const db = await pool.connect();
  try {
    await db.query("begin"); await db.query("select set_config('app.user_id', $1, true)", [user.id]);
    if (!(await db.query("select id from leads_canais where id=$1 and user_id=$2", [input.canal_id,user.id])).rowCount) throw new Error("Canal inválido");
    if (input.status === "convertido" && !(await db.query("select id from prospeccao_leads where id=$1 and user_id=$2 and cliente_id is not null", [id,user.id])).rowCount) throw new Error("Converta o lead primeiro");
    const values = [input.nome.trim(), input.contato, input.email, input.telefone, input.canal_id, input.status, input.notas, input.ultimo_contato, input.proximo_contato, input.valor_potencial, user.id];
    const result = id ? await db.query("update prospeccao_leads set nome=$1,contato=$2,email=$3,telefone=$4,canal_id=$5,status=case when cliente_id is not null then 'convertido' else $6 end,notas=$7,ultimo_contato=$8,proximo_contato=$9,valor_potencial=$10 where user_id=$11 and id=$12 returning id", [...values,id]) : await db.query("insert into prospeccao_leads(nome,contato,email,telefone,canal_id,status,notas,ultimo_contato,proximo_contato,valor_potencial,user_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id", values);
    if (!result.rowCount) throw new Error("Lead não encontrado");
    await db.query("commit"); refresh(); return { error: null };
  } catch { await db.query("rollback"); return { error: "Não foi possível salvar o lead. Tente novamente." }; }
  finally { db.release(); }
}

export async function excluirConversa(id: string) {
  if (!uuid.test(id)) return { error: "Lead inválido." };
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const { error } = await db.from("prospeccao_leads").delete().eq("id",id).eq("user_id",user.id).select("id").single();
  if (error) return { error: "Não foi possível excluir o lead." };
  refresh(); return { error: null };
}

export async function converterConversa(id: string) {
  if (!uuid.test(id)) return { error: "Lead inválido." };
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const db = await pool.connect();
  try {
    await db.query("begin"); await db.query("select set_config('app.user_id',$1,true)", [user.id]);
    const lead = (await db.query<ConversaLead>("select * from prospeccao_leads where id=$1 and user_id=$2 for update", [id,user.id])).rows[0];
    if (!lead) throw new Error("Lead inválido");
    if (!lead.cliente_id) {
      const canal = (await db.query("select nome from leads_canais where id=$1 and user_id=$2", [lead.canal_id,user.id])).rows[0];
      const clienteId = randomUUID();
      await db.query("insert into clientes(id,user_id,nome,contato_nome,email,telefone,status,origem,valor_potencial,ultima_interacao) values($1,$2,$3,$4,$5,$6,'cliente',$7,$8,now())", [clienteId,user.id,lead.nome,lead.contato,lead.email,lead.telefone,`Prospecção · ${canal?.nome ?? "Outros"}`,lead.valor_potencial]);
      await db.query("insert into historico(user_id,cliente_id,tipo,descricao) values($1,$2,'lead_convertido',$3)", [user.id,clienteId,`Lead convertido em cliente pela Prospecção. ${lead.notas}`]);
      await db.query("update prospeccao_leads set cliente_id=$1,status='convertido' where id=$2 and user_id=$3", [clienteId,id,user.id]);
    }
    await db.query("commit"); refresh(); return { error: null };
  } catch { await db.query("rollback"); return { error: "Não foi possível converter o lead. Nenhum cliente foi criado neste envio." }; }
  finally { db.release(); }
}
