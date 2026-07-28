import bcrypt from "bcryptjs";

// bcryptjs (puro JS) em vez de bcrypt nativo — evita dor de compilação em
// Alpine/musl na imagem Docker, e roda idêntico local/VPS.
export function hashSenha(senha: string) {
  return bcrypt.hash(senha, 12);
}

export function verificarSenha(senha: string, hash: string) {
  return bcrypt.compare(senha, hash);
}
