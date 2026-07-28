import { SignJWT, jwtVerify } from "jose";

// jose (Web Crypto) em vez de jsonwebtoken: precisa rodar tanto no middleware
// (Edge Runtime, obrigatório no Next 14 — não dá pra trocar) quanto em Server
// Components/Route Handlers (Node). jsonwebtoken usa o módulo `crypto` do
// Node e quebraria no Edge.

export const SESSION_COOKIE = "erp_session";
export const SESSION_MAX_AGE_SEG = 60 * 60 * 24 * 30; // 30 dias

export type SessionUser = { id: string; email: string };

function segredo() {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET não definido");
  return new TextEncoder().encode(raw);
}

export function assinarSessao(user: SessionUser) {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEG}s`)
    .sign(segredo());
}

export async function verificarSessao(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
