import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { pool } from "../src/lib/db/pool";
import { assinarSessao, verificarSessao } from "../src/lib/auth/session";
import { verificarSessaoAtiva } from "../src/lib/auth/active-session";
import { hashSenha, verificarSenha } from "../src/lib/auth/password";
import { changePassword, type PasswordRepository } from "../src/lib/auth/change-password";
import { passwordChangeError } from "../src/lib/auth/password-policy";
import { POST } from "../src/app/api/auth/change-password/route";

async function main() {
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.APP_URL = "https://erp.jeffersonthales.com";
  const user = { id: "00000000-0000-4000-8000-000000000001", email: "jeff.thchaves@gmail.com", sessionVersion: 0 };
  const current = randomBytes(24).toString("base64url");
  const next = randomBytes(24).toString("base64url");
  let hash = await hashSenha(current); let version = 0; let attempts = 0;
  const repository: PasswordRepository = {
    async reserve() { return ++attempts <= 5; },
    async read() { return { hash,version }; },
    async replace(_id, previous, replacement, expectedVersion) {
      if (previous !== hash || expectedVersion !== version) return false;
      hash = replacement; version++; attempts = 0; return true;
    },
  };
  const good = { currentPassword: current,newPassword:next,confirmation:next };
  assert(passwordChangeError(current,"curta","curta"));
  assert(passwordChangeError(current,"á".repeat(37),"á".repeat(37)));
  assert(passwordChangeError(current,next,next+"x"));
  assert.equal(passwordChangeError(current,"x".repeat(72),"x".repeat(72)),null);
  let result = await changePassword(user,{...good,confirmation:"diferente"},repository);
  assert.equal(result.status,400); assert.equal(attempts,0);
  result = await changePassword(user,{...good,currentPassword:"incorreta"},repository);
  assert.equal(result.status,400); assert.equal(version,0); assert(await verificarSenha(current,hash));
  const originalHash = hash;
  result = await changePassword(user,good,repository);
  assert.equal(result.status,200); assert.equal(version,1); assert.notEqual(hash,originalHash);
  assert(await verificarSenha(next,hash)); assert(!await verificarSenha(current,hash));
  assert.equal((await changePassword(user,good,repository)).status,401);

  const originalQuery = pool.query;
  try {
    // A assinatura real e o validador de sessão consultam a versão atual simulada.
    pool.query = (async () => ({ rows:[{ email:user.email,session_version:version }] })) as unknown as typeof pool.query;
    const stale = await assinarSessao(user);
    assert.equal(await verificarSessaoAtiva(stale),null);
    const renewed = await assinarSessao((await verificarSessao(stale))!);
    assert.equal(await verificarSessaoAtiva(renewed),null);
    assert(await verificarSessaoAtiva(await assinarSessao({...user,sessionVersion:1})));
  } finally { pool.query = originalQuery; }

  attempts = 5;
  assert.equal((await changePassword({...user,sessionVersion:1},{currentPassword:next,newPassword:current,confirmation:current},repository)).status,429);
  attempts = 0;
  const concurrent = await Promise.all([current+"A",current+"B"].map(value => changePassword({...user,sessionVersion:1},{currentPassword:next,newPassword:value,confirmation:value},repository)));
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  assert.equal(version,2);

  assert.equal((await POST(new NextRequest("https://erp.jeffersonthales.com/api/auth/change-password",{method:"POST",headers:{origin:"https://outro.example","content-type":"application/json"},body:"{}"}))).status,403);
  assert.equal((await POST(new NextRequest("https://erp.jeffersonthales.com/api/auth/change-password",{method:"POST",headers:{origin:process.env.APP_URL,"content-type":"application/json"},body:"{}"}))).status,401);
  console.log("Troca de senha: confirmação, bcrypt, limite, concorrência, CSRF e revogação de sessões conferidos.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
