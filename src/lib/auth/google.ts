import { randomBytes, createHash } from "node:crypto";
import { SignJWT, jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";
import { isOwnerEmail } from "./owner";

export const GOOGLE_FLOW_COOKIE = "erp_google_flow";
export const GOOGLE_FLOW_PATH = "/api/auth/google";
const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), { timeoutDuration: 5000 });
const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error("Sessão indisponível.");
  return new TextEncoder().encode(process.env.JWT_SECRET);
};
export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const origin = new URL(process.env.APP_URL || "https://erp.jeffersonthales.com").origin;
  return { clientId, clientSecret, origin, redirectUri: `${origin}/api/auth/google/callback`, enabled: Boolean(clientId && clientSecret) };
}
export async function createGoogleFlow() {
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const cookie = await new SignJWT({ state, nonce, verifier })
    .setProtectedHeader({ alg: "HS256" }).setAudience("erp-google-login").setIssuedAt().setExpirationTime("10m").sign(secret());
  return { state, nonce, challenge, cookie };
}
export async function readGoogleFlow(cookie: string | undefined, state: string | null) {
  if (!cookie || !state) throw new Error("Tentativa de login inválida.");
  const { payload } = await jwtVerify(cookie, secret(), { algorithms: ["HS256"], audience: "erp-google-login" });
  if (payload.state !== state || typeof payload.nonce !== "string" || typeof payload.verifier !== "string") throw new Error("Tentativa de login inválida.");
  return { nonce: payload.nonce, verifier: payload.verifier };
}
export function googleOwnerClaims(payload: JWTPayload, nonce: string) {
  if (typeof payload.sub !== "string" || !payload.sub || payload.nonce !== nonce || payload.email_verified !== true || !isOwnerEmail(payload.email)) throw new Error("Conta não autorizada.");
  return payload.email.trim().toLowerCase();
}
export async function verifyGoogleIdentity(token: string, clientId: string, nonce: string) {
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"], issuer: ["https://accounts.google.com", "accounts.google.com"], audience: clientId,
    requiredClaims: ["sub", "exp", "iat", "email", "email_verified", "nonce"],
  });
  return googleOwnerClaims(payload, nonce);
}
