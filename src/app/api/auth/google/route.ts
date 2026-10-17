import { NextResponse } from "next/server";
import { OWNER_EMAIL } from "@/lib/auth/owner";
import { googleConfig, createGoogleFlow, GOOGLE_FLOW_COOKIE, GOOGLE_FLOW_PATH } from "@/lib/auth/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const config = googleConfig();
  if (!config.enabled) return NextResponse.redirect(new URL("/login?erro=google_indisponivel", config.origin));
  const flow = await createGoogleFlow();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId!, redirect_uri: config.redirectUri, response_type: "code", scope: "openid email",
    state: flow.state, nonce: flow.nonce, code_challenge: flow.challenge, code_challenge_method: "S256",
    login_hint: OWNER_EMAIL, prompt: "select_account",
  }).toString();
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(GOOGLE_FLOW_COOKIE, flow.cookie, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: GOOGLE_FLOW_PATH, maxAge: 600,
  });
  return response;
}
