export const AGENDA_TZ = "America/Fortaleza";
export type EventoTipo = "reuniao" | "lembrete" | "bloco" | "entrega" | "data_importante" | "pagamento";
export type AgendaEvent = {
  id: string; titulo: string; tipo_ev: EventoTipo; quando: string; fim: string | null;
  dia_inteiro: boolean; local: string | null; notas: string | null; projeto_id: string | null;
  valor: number | string | null; moeda: "BRL" | "USD" | "EUR"; pago: boolean;
};
export type AgendaTask = { id: string; titulo: string; data_finalizar: string };
export type AgendaRecebimento = {
  id: string; descricao: string | null; valor: number | string; valor_pago: number | string;
  moeda: "BRL" | "USD" | "EUR"; status: string; vencimento: string | null;
  clientes: { nome: string } | null;
};
export type AgendaItem = {
  id: string; sourceId: string; origem: "evento" | "tarefa" | "recebimento";
  titulo: string; data: string; ate: string; horario: string; tipo: EventoTipo | "tarefa" | "recebimento";
  valor: number | null; moeda: "BRL" | "USD" | "EUR"; concluido: boolean; detalhe: string;
};
export const AGENDA_TIPOS: Record<AgendaItem["tipo"], { label: string; cor: string; tint: string }> = {
  data_importante: { label: "Data importante", cor: "#BE185D", tint: "#FDF2F8" },
  pagamento: { label: "A pagar", cor: "#C77700", tint: "#FFFBEB" },
  recebimento: { label: "A receber", cor: "#0E9F6E", tint: "#ECFDF5" },
  reuniao: { label: "Reunião", cor: "#C51E72", tint: "#EFF6FF" },
  lembrete: { label: "Lembrete", cor: "#C77700", tint: "#FFFBEB" },
  bloco: { label: "Bloco de tempo", cor: "#7A5AF8", tint: "#F5F3FF" },
  entrega: { label: "Entrega", cor: "#0E9F6E", tint: "#ECFDF5" },
  tarefa: { label: "Tarefa", cor: "#64748B", tint: "#FAF8FC" },
};
export function agendaDate(value: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: AGENDA_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function agendaTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: AGENDA_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
export function agendaMoney(value: number, currency: AgendaItem["moeda"]) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}
export function validAgendaDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function montarAgenda(eventos: AgendaEvent[], tarefas: AgendaTask[], recebimentos: AgendaRecebimento[]): AgendaItem[] {
  const items: AgendaItem[] = eventos.map(e => {
    const data = agendaDate(e.quando);
    const ate = e.fim && new Date(e.fim) > new Date(e.quando) ? agendaDate(new Date(new Date(e.fim).getTime() - 1)) : data;
    return {
      id: `evento:${e.id}`, sourceId: e.id, origem: "evento", titulo: e.titulo, data, ate,
      horario: e.dia_inteiro ? "Dia inteiro" : agendaTime(e.quando), tipo: e.tipo_ev,
      valor: e.tipo_ev === "pagamento" && e.valor != null ? Number(e.valor) : null,
      moeda: e.moeda, concluido: e.tipo_ev === "pagamento" && e.pago,
      detalhe: [e.local, e.notas].filter(Boolean).join(" · "),
    };
  });
  for (const t of tarefas) if (t.data_finalizar) items.push({
    id: `tarefa:${t.id}`, sourceId: t.id, origem: "tarefa", titulo: t.titulo,
    data: t.data_finalizar, ate: t.data_finalizar, horario: "Dia inteiro", tipo: "tarefa",
    valor: null, moeda: "BRL", concluido: false, detalhe: "Tarefas do dia",
  });
  for (const r of recebimentos) if (r.vencimento) {
    const saldo = Math.max(0, Number(r.valor) - Number(r.valor_pago));
    items.push({
      id: `recebimento:${r.id}`, sourceId: r.id, origem: "recebimento", titulo: r.descricao || `Recebimento · ${r.clientes?.nome ?? "Sem cliente"}`,
      data: r.vencimento, ate: r.vencimento, horario: "Dia inteiro", tipo: "recebimento",
      valor: r.status === "pago" || saldo === 0 ? Number(r.valor) : saldo, moeda: r.moeda,
      concluido: r.status === "pago" || saldo === 0, detalhe: `${r.clientes?.nome ?? "Sem cliente"} · Financeiro`,
    });
  }
  return items.sort((a, b) => a.data.localeCompare(b.data) || (a.horario === "Dia inteiro" ? "00:00" : a.horario).localeCompare(b.horario === "Dia inteiro" ? "00:00" : b.horario) || a.titulo.localeCompare(b.titulo));
}
export function agendaNoPeriodo(items: AgendaItem[], inicio: string, fim: string) {
  return items.filter(item => item.data <= fim && item.ate >= inicio)
    .map(item => item.data < inicio ? { ...item, horario: "Em andamento" } : item);
}

// These highlights intentionally use the whole agenda, independently of its visible period/filter.
export function agendaDestaques(items: AgendaItem[], today: string) {
  const hoje = agendaNoPeriodo(items, today, today);
  const rank = (item: AgendaItem) => item.data <= today && item.ate >= today ? 0 : item.data > today ? 1 : 2;
  const lembretes = items.filter(item => item.origem === "evento" && ["lembrete", "data_importante"].includes(item.tipo))
    .sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? b.data.localeCompare(a.data) : a.data.localeCompare(b.data)) || (a.horario === "Dia inteiro" ? "00:00" : a.horario).localeCompare(b.horario === "Dia inteiro" ? "00:00" : b.horario) || a.titulo.localeCompare(b.titulo));
  return { hoje, lembretes };
}
