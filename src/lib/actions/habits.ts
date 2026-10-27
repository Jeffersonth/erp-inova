"use server";
import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db/pool";
import { createClient } from "@/lib/supabase/server";
import { agendaDate, validAgendaDate } from "@/lib/agenda-items";
import { HABIT_COLORS, habitUuid, type Habit } from "@/lib/habits";
async function mutate(run: (db: PoolClient, user: string) => Promise<void>) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return { error: "Sessão encerrada. Entre novamente." };
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('app.user_id',$1,true)", [user.id]);
    await run(db, user.id);
    await db.query("commit");
    revalidatePath("/habitos");
    return { error: null };
  } catch (error) {
    await db.query("rollback");
    return {
      error: (error as Error).message.startsWith("HABIT:")
        ? (error as Error).message.slice(6)
        : "Não foi possível salvar. Seu registro anterior foi preservado; tente novamente.",
    };
  } finally {
    db.release();
  }
}
export async function saveHabit(input: Omit<Habit, "arquivado">) {
  if (
    !input ||
    !habitUuid.test(input.id) ||
    typeof input.titulo !== "string" ||
    !input.titulo.trim() ||
    input.titulo.trim().length > 120 ||
    typeof input.descricao !== "string" ||
    input.descricao.length > 500 ||
    !HABIT_COLORS.some((c) => c.value === input.cor) ||
    !validAgendaDate(input.inicio) ||
    input.inicio > agendaDate()
  )
    return { error: "Confira o título, a cor e a data de início (até hoje)." };
  return mutate(async (db, user) => {
    const previous = await db.query(
      "select id from habitos where id=$1 and user_id=$2 for update",
      [input.id, user],
    );
    if (
      previous.rowCount &&
      (
        await db.query(
          "select 1 from habitos_dias where habito_id=$1 and user_id=$2 and data<$3 limit 1",
          [input.id, user, input.inicio],
        )
      ).rowCount
    )
      throw new Error(
        "HABIT:Existem dias marcados antes da nova data de início. Escolha uma data anterior ou igual ao primeiro registro.",
      );
    await db.query(
      "insert into habitos(id,user_id,titulo,descricao,cor,inicio) values($1,$2,$3,$4,$5,$6) on conflict(id) do update set titulo=excluded.titulo,descricao=excluded.descricao,cor=excluded.cor,inicio=excluded.inicio",
      [
        input.id,
        user,
        input.titulo.trim(),
        input.descricao.trim(),
        input.cor,
        input.inicio,
      ],
    );
  });
}
export async function checkHabit(id: string, day: string, completed: boolean) {
  if (
    !habitUuid.test(id) ||
    !validAgendaDate(day) ||
    day > agendaDate() ||
    typeof completed !== "boolean"
  )
    return { error: "Escolha um dia válido, até hoje." };
  return mutate(async (db, user) => {
    const row = (
      await db.query(
        "select inicio::text,arquivado from habitos where id=$1 and user_id=$2 for update",
        [id, user],
      )
    ).rows[0];
    if (!row || row.arquivado || day < row.inicio)
      throw new Error(
        "HABIT:Este dia não está disponível. Confira a data de início e se o hábito está ativo.",
      );
    if (completed)
      await db.query(
        "insert into habitos_dias(habito_id,user_id,data) values($1,$2,$3) on conflict(habito_id,data) do nothing",
        [id, user, day],
      );
    else
      await db.query(
        "delete from habitos_dias where habito_id=$1 and user_id=$2 and data=$3",
        [id, user, day],
      );
  });
}
export async function archiveHabit(id: string, archived: boolean) {
  if (!habitUuid.test(id) || typeof archived !== "boolean")
    return { error: "Hábito inválido." };
  return mutate(async (db, user) => {
    if (
      !(
        await db.query(
          "update habitos set arquivado=$1 where id=$2 and user_id=$3 returning id",
          [archived, id, user],
        )
      ).rowCount
    )
      throw new Error("HABIT:Hábito não encontrado.");
  });
}
