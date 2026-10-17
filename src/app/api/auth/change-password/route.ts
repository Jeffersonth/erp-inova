import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db/pool";
import { verificarSessaoAtiva } from "@/lib/auth/active-session";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { changePassword, type PasswordRepository } from "@/lib/auth/change-password";

export const runtime = "nodejs";
const repository: PasswordRepository = {
  async reserve(id) { return (await pool.query("select auth.reserve_password_change_attempt($1) as allowed", [id])).rows[0].allowed; },
  async read(id) {
    const row = (await pool.query("select encrypted_password,session_version from auth.users where id=$1", [id])).rows[0];
    return row ? { hash: row.encrypted_password, version: row.session_version } : null;
  },
  async replace(id, oldHash, newHash, version) { return (await pool.query("select auth.change_own_password($1,$2,$3,$4) as changed", [id,oldHash,newHash,version])).rows[0].changed; },
};
const reply = (error: string | null, status: number) => NextResponse.json(error ? { error } : { ok: true }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const origin = new URL(process.env.APP_URL || "https://erp.jeffersonthales.com").origin;
  if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") return reply("Origem da solicitação inválida.",403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply("Envie o formulário novamente.",415);
  try {
    const user = await verificarSessaoAtiva(request.cookies.get(SESSION_COOKIE)?.value);
    if (!user) return reply("Sua sessão expirou. Entre novamente.",401);
    const reader = request.body?.getReader();
    if (!reader) return reply("Preencha o formulário.",400);
    const decoder = new TextDecoder(); let text = ""; let size = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.byteLength;
        if (size > 8192) { await reader.cancel(); return reply("Formulário muito grande.",413); }
        text += decoder.decode(part.value,{ stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    let input;
    try { input = JSON.parse(text); } catch { return reply("Formulário inválido.",400); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return reply("Formulário inválido.",400);
    const result = await changePassword(user,input,repository);
    const response = reply(result.error,result.status);
    if (!result.error) response.cookies.set(SESSION_COOKIE,"",{ httpOnly:true,secure:process.env.NODE_ENV === "production",sameSite:"lax",path:"/",maxAge:0 });
    return response;
  } catch { return reply("Não foi possível concluir. Entre novamente antes de tentar outra vez.",500); }
}
