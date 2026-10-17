import { agendaDate } from "./agenda-items";
import type { PersonalProject } from "./personal-projects";
import type { ConversaLead } from "./prospeccao";

export type DashboardTask = {
  id: string;
  titulo: string;
  status: string;
  data_finalizar: string | null;
};
export const percentual = (done: number, total: number) =>
  total > 0 ? Math.min(100, Math.max(0, Math.round((done / total) * 100))) : 0;
export const conversaAtiva = (lead: Pick<ConversaLead, "status">) =>
  !["convertido", "perdido"].includes(lead.status);
export function resumoTarefas(tasks: DashboardTask[], today: string) {
  const done = tasks.filter((t) => t.status === "concluida").length;
  const open = tasks.filter((t) => t.status !== "concluida");
  return {
    total: tasks.length,
    done,
    open: open.length,
    pct: percentual(done, tasks.length),
    late: open.filter((t) => t.data_finalizar && t.data_finalizar < today)
      .length,
    today: open.filter((t) => t.data_finalizar === today).length,
    next: [...open]
      .sort((a, b) =>
        (a.data_finalizar || "9999").localeCompare(b.data_finalizar || "9999"),
      )
      .slice(0, 4),
  };
}
export function resumoPessoais(projects: PersonalProject[], today: string) {
  const items = projects.map((p) => {
    const steps = p.etapas ?? [];
    const done = steps.filter((s) => s.concluida).length;
    const completed = steps.length > 0 && done === steps.length;
    return {
      ...p,
      total: steps.length,
      done,
      pct: percentual(done, steps.length),
      completed,
      late: !completed && Boolean(p.prazo && p.prazo < today),
      lateSteps: steps.filter((s) => !s.concluida && s.prazo && s.prazo < today)
        .length,
    };
  });
  const total = items.reduce((s, p) => s + p.total, 0);
  const done = items.reduce((s, p) => s + p.done, 0);
  return {
    items: items.sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        (a.prazo || "9999").localeCompare(b.prazo || "9999"),
    ),
    total,
    done,
    pct: percentual(done, total),
    completed: items.filter((p) => p.completed).length,
    late: items.filter((p) => p.late || p.lateSteps > 0).length,
    notes: items.reduce((s, p) => s + (p.notas ?? []).length, 0),
    notesDone: items.reduce(
      (s, p) => s + (p.notas ?? []).filter((n) => n.concluida).length,
      0,
    ),
  };
}
export function focoSemana(
  rows: { finalizada_em: string; duracao_seg: number | string }[],
  today: string,
) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 6 + i);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      label: new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Fortaleza",
        weekday: "short",
      })
        .format(d)
        .replace(".", ""),
      seconds: rows
        .filter((r) => agendaDate(r.finalizada_em) === date)
        .reduce((s, r) => s + Number(r.duracao_seg), 0),
    };
  });
}
