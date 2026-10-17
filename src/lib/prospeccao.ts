import type { LeadRegistro, LeadCanal } from "@/lib/leads";
export type ConversaStatus = "respondeu" | "em_contato" | "proposta" | "negociacao" | "convertido" | "perdido";
export const CONVERSA_STATUS: Record<ConversaStatus, string> = {
  respondeu: "Respondeu", em_contato: "Em contato", proposta: "Proposta enviada",
  negociacao: "Negociação", convertido: "Convertido em cliente", perdido: "Não avançou",
};
export type ConversaLead = {
  id: string; nome: string; contato: string | null; email: string | null; telefone: string | null;
  canal_id: string; status: ConversaStatus; notas: string; proximo_contato: string | null;
  ultimo_contato: string; valor_potencial: number | string | null; cliente_id: string | null;
};
export type AtividadeCanal = { canal_id: string; contatos: number; propostas: number; respostas: number };
export const isWorkana = (name: string) => name.toLocaleLowerCase("pt-BR").includes("workana");
export function canalLabel(name: string) {
  if (name.toLowerCase().includes("google")) return "Google Meu Negócio";
  if (/e-?mail/i.test(name)) return "E-mail";
  return name;
}

export function normalizarRegistros(regs: LeadRegistro[], canais: LeadCanal[]) {
  const workana = new Set(canais.filter(c => isWorkana(c.nome)).map(c => c.id));
  return regs.map(r => workana.has(r.canal_id) ? { ...r, contatos: Math.max(r.contatos, r.propostas) } : r);
}
