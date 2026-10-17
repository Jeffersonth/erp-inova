import { pool } from "@/lib/db/pool";
import { verificarSessao } from "./session";
export async function verificarSessaoAtiva(token: string | null | undefined) {
  const user = await verificarSessao(token);
  if (!user) return null;
  const row = (await pool.query<{ email: string; session_version: number }>("select email,session_version from auth.users where id=$1", [user.id])).rows[0];
  if (!row || row.email.toLowerCase() !== user.email.toLowerCase() || row.session_version !== (user.sessionVersion ?? 0)) return null;
  return user;
}
