"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AGENDA_TIPOS, type AgendaEvent } from "@/lib/agenda-items";

export type EventoInput = Omit<AgendaEvent, "id">;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const columns = "id, titulo, tipo_ev, quando, fim, dia_inteiro, local, notas, projeto_id, valor, moeda, pago";
function refresh() { revalidatePath("/agenda"); revalidatePath("/hoje"); }

export async function salvarEvento(id: string | null, input: EventoInput) {
  if (!input || (id !== null && !uuid.test(id)) || typeof input.titulo !== "string" || !input.titulo.trim() || input.titulo.length > 200 ||
      !Object.hasOwn(AGENDA_TIPOS, input.tipo_ev) || ["tarefa", "recebimento"].includes(input.tipo_ev) ||
      typeof input.quando !== "string" || !Number.isFinite(Date.parse(input.quando)) ||
      (input.fim !== null && (typeof input.fim !== "string" || !Number.isFinite(Date.parse(input.fim)) || new Date(input.fim) <= new Date(input.quando))) ||
      typeof input.dia_inteiro !== "boolean" || typeof input.pago !== "boolean" ||
      !["BRL", "USD", "EUR"].includes(input.moeda) ||
      (input.valor !== null && (typeof input.valor !== "number" || !Number.isFinite(input.valor) || input.valor < 0 || input.valor > 999999999999.99)) ||
      (input.local !== null && (typeof input.local !== "string" || input.local.length > 500)) ||
      (input.notas !== null && (typeof input.notas !== "string" || input.notas.length > 10000)) ||
      (input.projeto_id !== null && !uuid.test(input.projeto_id))) {
    return { data: null, error: "Confira o título, a data, os horários e o valor informado." };
  }
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { data: null, error: "Sessão expirada. Faça login novamente." };
  const payload = {
    titulo: input.titulo.trim(), tipo_ev: input.tipo_ev, quando: input.quando, fim: input.fim,
    dia_inteiro: input.dia_inteiro, local: input.local, notas: input.notas, projeto_id: input.projeto_id,
    valor: input.tipo_ev === "pagamento" ? input.valor : null, moeda: input.moeda,
    pago: input.tipo_ev === "pagamento" && input.pago,
  };
  const result = id
    ? await db.from<AgendaEvent>("eventos_agenda").update(payload).eq("id", id).eq("user_id", user.id).select(columns).single()
    : await db.from<AgendaEvent>("eventos_agenda").insert({ ...payload, user_id: user.id }).select(columns).single();
  if (result.error) return { data: null, error: "Não foi possível salvar o item na agenda." };
  refresh(); return { data: result.data, error: null };
}

export async function excluirEvento(id: string) {
  if (!uuid.test(id)) return { error: "Item inválido." };
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const { error } = await db.from("eventos_agenda").delete().eq("id", id).eq("user_id", user.id).select("id").single();
  if (error) return { error: "Não foi possível excluir o item." };
  refresh(); return { error: null };
}

export async function marcarPagamentoAgenda(id: string, pago: boolean) {
  if (!uuid.test(id) || typeof pago !== "boolean") return { error: "Pagamento inválido." };
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const { error } = await db.from("eventos_agenda").update({ pago }).eq("id", id).eq("user_id", user.id).eq("tipo_ev", "pagamento").select("id").single();
  if (error) return { error: "Não foi possível atualizar o pagamento." };
  refresh(); return { error: null };
}
