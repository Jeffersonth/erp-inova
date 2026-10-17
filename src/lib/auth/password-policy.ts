export function passwordChangeError(current: unknown, next: unknown, confirmation: unknown) {
  if (typeof current !== "string" || !current || current.length > 1024 || typeof next !== "string" || typeof confirmation !== "string") return "Preencha as três senhas.";
  if (Array.from(next).length < 15) return "Use pelo menos 15 caracteres na nova senha.";
  if (new TextEncoder().encode(next).length > 72) return "A nova senha é muito longa. Use até 72 bytes (caracteres acentuados podem ocupar mais de um).";
  if (next !== confirmation) return "A confirmação não corresponde à nova senha.";
  if (current === next) return "Escolha uma senha diferente da atual.";
  return null;
}
