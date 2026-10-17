import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db/pool";
import { assinarSessao, SESSION_COOKIE, SESSION_MAX_AGE_SEG } from "@/lib/auth/session";
import { googleConfig, readGoogleFlow, verifyGoogleIdentity, GOOGLE_FLOW_COOKIE, GOOGLE_FLOW_PATH } from "@/lib/auth/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const config = googleConfig();
  const clearFlow = (response: NextResponse) => {
    response.cookies.set(GOOGLE_FLOW_COOKIE, "", { path: GOOGLE_FLOW_PATH, maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  if (!config.enabled) return clearFlow(NextResponse.redirect(new URL("/login?erro=google_indisponivel", config.origin)));
  try {
    const params = request.nextUrl.searchParams;
    if (params.has("error") || !params.get("code")) throw new Error("Login cancelado.");
    const flow = await readGoogleFlow(request.cookies.get(GOOGLE_FLOW_COOKIE)?.value, params.get("state"));
    const result = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, cache: "no-store", signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({ code: params.get("code")!, client_id: config.clientId!, client_secret: config.clientSecret!, redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: flow.verifier }),
    });
    if (!result.ok) throw new Error("Login não confirmado.");
    const tokens = await result.json();
    if (typeof tokens.id_token !== "string") throw new Error("Identidade não confirmada.");
    const email = await verifyGoogleIdentity(tokens.id_token, config.clientId!, flow.nonce);
    // Vincula à conta existente: nenhum cadastro ou troca de dono dos dados.
    const user = (await pool.query<{ id: string; email: string; session_version: number }>("select id,email,session_version from auth.users where lower(email)=$1", [email])).rows[0];
    if (!user) throw new Error("Conta não autorizada.");
    const response = NextResponse.redirect(new URL("/hoje", config.origin));
    response.cookies.set(SESSION_COOKIE, await assinarSessao({ id: user.id, email: user.email, sessionVersion: user.session_version }), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_SEG,
    });
    return clearFlow(response);
  } catch {
    // Tokens, códigos e segredos nunca são enviados ao log ou à interface.
    return clearFlow(NextResponse.redirect(new URL("/login?erro=google_falhou", config.origin)));
  }
}
