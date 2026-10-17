export type RegraCategoria = { id: string; nome: string; ordem: number };
export type Regra = { id: string; categoria_id: string; texto: string; ordem: number };
export const regraUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseRegraTopicos(text: unknown): string[] | null {
  if (typeof text !== "string" || text.length > 100000) return null;
  const topics = text.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
  if (!topics.length || topics.length > 50 || topics.some(t => t.length > 2000)) return null;
  return topics;
}
