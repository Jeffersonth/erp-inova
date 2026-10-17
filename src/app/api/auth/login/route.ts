import { isOwnerEmail } from "@/lib/auth/owner";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { verificarSenha } from "@/lib/auth/password";
import { assinarSessao, SESSION_COOKIE, SESSION_MAX_AGE_SEG } from "@/lib/auth/session";

function credenciaisInvalidas() {
  // mesma mensagem pra "e-mail não existe" e "senha errada" — não vaza
  // quais e-mails têm cadastro.
  return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const senha = body?.password;

  if (typeof email !== "string" || typeof senha !== "string" || !email || !senha) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }

  if (!isOwnerEmail(email)) return credenciaisInvalidas();

  const result = await pool.query<{ id: string; email: string; encrypted_password: string | null; session_version: number }>(
    "select id, email, encrypted_password, session_version from auth.users where lower(email) = $1",
    [email.trim().toLowerCase()],
  );
  const row = result.rows[0];
  if (!row || !row.encrypted_password) return credenciaisInvalidas();

  const ok = await verificarSenha(senha, row.encrypted_password);
  if (!ok) return credenciaisInvalidas();

  const token = await assinarSessao({ id: row.id, email: row.email, sessionVersion: row.session_version });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEG,
  });
  return response;
}
