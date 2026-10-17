import { hashSenha, verificarSenha } from "./password";
import { passwordChangeError } from "./password-policy";
import type { SessionUser } from "./session";

export type PasswordRepository = {
  reserve(id: string): Promise<boolean>;
  read(id: string): Promise<{ hash: string | null; version: number } | null>;
  replace(id: string, oldHash: string, newHash: string, version: number): Promise<boolean>;
};
export async function changePassword(user: SessionUser, input: { currentPassword?: unknown; newPassword?: unknown; confirmation?: unknown }, repository: PasswordRepository) {
  const error = passwordChangeError(input.currentPassword,input.newPassword,input.confirmation);
  if (error) return { status: 400, error };
  if (!await repository.reserve(user.id)) return { status: 429, error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." };
  const row = await repository.read(user.id);
  if (!row || row.version !== (user.sessionVersion ?? 0)) return { status: 401, error: "Sessão encerrada. Entre novamente." };
  if (!row.hash || !await verificarSenha(input.currentPassword as string,row.hash)) return { status: 400, error: "A senha atual está incorreta." };
  if (await verificarSenha(input.newPassword as string,row.hash)) return { status: 400, error: "Escolha uma senha diferente da atual." };
  const hash = await hashSenha(input.newPassword as string);
  if (!await repository.replace(user.id,row.hash,hash,row.version)) return { status: 409, error: "Sua sessão ou senha mudou durante o envio. Entre novamente." };
  return { status: 200, error: null };
}
