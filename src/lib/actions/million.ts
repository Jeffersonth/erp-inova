"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { agendaDate, validAgendaDate } from "@/lib/agenda-items";
import { journeyUuid, toCents, type JourneyGoal } from "@/lib/million";
type GainInput = {
  id: string;
  titulo: string;
  valor: string;
  data: string;
  origem: string;
  notas: string;
};
async function owner() {
  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  return { db, user };
}
function done(error: unknown) {
  if (error) return { error: "Não foi possível salvar. Tente novamente." };
  revalidatePath("/do-zero-ao-milhao");
  return { error: null };
}
export async function saveJourneyGain(input: GainInput) {
  if (!input || typeof input !== "object") return { error: "Ganho inválido." };
  const cents = toCents(input.valor);
  if (
    !journeyUuid.test(input.id) ||
    typeof input.titulo !== "string" ||
    !input.titulo.trim() ||
    input.titulo.trim().length > 160 ||
    cents === null ||
    !validAgendaDate(input.data) ||
    input.data > agendaDate() ||
    typeof input.origem !== "string" ||
    input.origem.length > 80 ||
    typeof input.notas !== "string" ||
    input.notas.length > 2000
  )
    return {
      error: "Confira o título, o valor positivo e a data do ganho (até hoje).",
    };
  const { db, user } = await owner();
  if (!user) return { error: "Entre novamente para salvar." };
  const { error } = await db
    .from("jornada_ganhos")
    .upsert(
      {
        id: input.id,
        user_id: user.id,
        titulo: input.titulo.trim(),
        valor_centavos: cents,
        data: input.data,
        origem: input.origem.trim(),
        notas: input.notas.trim(),
      },
      { onConflict: "id" },
    );
  return done(error);
}
export async function deleteJourneyGain(id: string) {
  if (!journeyUuid.test(id)) return { error: "Ganho inválido." };
  const { db, user } = await owner();
  if (!user) return { error: "Entre novamente para continuar." };
  const { error } = await db
    .from("jornada_ganhos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  return done(error);
}
type GoalInput = {
  id: string | null;
  titulo: string;
  valor: string;
  tipo: "marco" | "mensal";
  mes: string | null;
  prazo: string | null;
  concluido_em: string | null;
};
export async function saveJourneyGoal(input: GoalInput) {
  if (!input || typeof input !== "object") return { error: "Objetivo inválido." };
  const cents = toCents(input.valor);
  if (
    (input.id !== null && !journeyUuid.test(input.id)) ||
    typeof input.titulo !== "string" ||
    !input.titulo.trim() ||
    input.titulo.trim().length > 120 ||
    cents === null ||
    !["marco", "mensal"].includes(input.tipo) ||
    (input.tipo === "mensal" &&
      (!input.mes ||
        !validAgendaDate(input.mes) ||
        !input.mes.endsWith("-01"))) ||
    (input.prazo !== null && !validAgendaDate(input.prazo)) ||
    (input.concluido_em !== null &&
      (!validAgendaDate(input.concluido_em) ||
        input.concluido_em > agendaDate()))
  )
    return { error: "Confira o título, o valor e as datas do objetivo." };
  const { db, user } = await owner();
  if (!user) return { error: "Entre novamente para salvar." };
  let id = input.id;
  if (!id && input.tipo === "mensal") {
    const existing = await db
      .from<JourneyGoal>("jornada_objetivos")
      .select("id")
      .eq("user_id", user.id)
      .eq("tipo", "mensal")
      .eq("mes", input.mes)
      .maybeSingle();
    if (existing.error) return done(existing.error);
    id = existing.data?.id ?? null;
  }
  const values = {
    user_id: user.id,
    titulo: input.titulo.trim(),
    alvo_centavos: cents,
    tipo: input.tipo,
    mes: input.tipo === "mensal" ? input.mes : null,
    prazo: input.tipo === "marco" ? input.prazo : null,
    concluido_em: input.concluido_em,
  };
  const result = id
    ? await db
        .from("jornada_objetivos")
        .update(values)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single()
    : await db.from("jornada_objetivos").insert(values).select("id").single();
  if (result.error?.message.includes("duplicate"))
    return {
      error: "Já existe um marco com esse valor ou uma meta para este mês.",
    };
  return done(result.error);
}
export async function deleteJourneyGoal(id: string) {
  if (!journeyUuid.test(id)) return { error: "Objetivo inválido." };
  const { db, user } = await owner();
  if (!user) return { error: "Entre novamente para continuar." };
  const { error } = await db
    .from("jornada_objetivos")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  return done(error);
}
