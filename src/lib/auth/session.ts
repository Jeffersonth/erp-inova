import { isOwnerEmail } from "./owner";
import { SignJWT, jwtVerify } from "jose";

// jose (Web Crypto) em vez de jsonwebtoken: precisa rodar tanto no middleware
// (Edge Runtime, obrigatório no Next 14 — não dá pra trocar) quanto em Server
// Components/Route Handlers (Node). jsonwebtoken usa o módulo `crypto` do
// Node e quebraria no Edge.

export const SESSION_COOKIE = "erp_session";
export const SESSION_MAX_AGE_SEG = 60 * 60 * 24 * 30; // 30 dias

export type SessionUser = { id: string; email: string; sessionVersion?: number };

function segredo() {
  const raw = process.env.JWT_SECRET;
  if (!raw) throw new Error("JWT_SECRET não definido");
  return new TextEncoder().encode(raw);
}

export function assinarSessao(user: SessionUser) {
  if (!isOwnerEmail(user.email)) throw new Error("Acesso não autorizado.");
  return new SignJWT({ email: user.email.trim().toLowerCase(), role: "admin", ver: user.sessionVersion ?? 0 })
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
    const { payload } = await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || !isOwnerEmail(payload.email)) {
      return null;
    }
    const version = payload.ver ?? 0;
    if (!Number.isSafeInteger(version) || (version as number) < 0) return null;
    return { id: payload.sub, email: payload.email, sessionVersion: version as number };
  } catch {
    return null;
  }
}
