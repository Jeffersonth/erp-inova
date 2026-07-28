import { promises as fs } from "node:fs";
import path from "node:path";

// Substitui o Supabase Storage por disco local (VPS: volume montado em
// STORAGE_DIR pelo docker-compose; dev: pasta .data/storage no projeto).
const STORAGE_ROOT = process.env.STORAGE_DIR || path.join(process.cwd(), ".data", "storage");

export type StorageBucket = "avatars" | "arquivos";

// Nunca confia no relPath vindo de URL/coluna do banco sem checar que o
// caminho resolvido continua dentro da raiz do bucket — barra a travessia
// tipo "../../etc/passwd" via segmento de path malicioso.
function resolveSeguro(bucket: StorageBucket, relPath: string) {
  const root = path.join(STORAGE_ROOT, bucket);
  const resolved = path.join(root, relPath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Caminho fora do bucket: ${relPath}`);
  }
  return resolved;
}

export async function salvarArquivo(bucket: StorageBucket, relPath: string, buffer: Buffer) {
  const full = resolveSeguro(bucket, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
}

export async function lerArquivo(bucket: StorageBucket, relPath: string): Promise<Buffer | null> {
  const full = resolveSeguro(bucket, relPath);
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}

export async function removerArquivo(bucket: StorageBucket, relPath: string) {
  const full = resolveSeguro(bucket, relPath);
  try {
    await fs.unlink(full);
  } catch {
    // já não existia — mesmo comportamento "idempotente" do supabase.storage.remove()
  }
}
