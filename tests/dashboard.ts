import assert from "node:assert/strict";
import {
  conversaAtiva,
  focoSemana,
  percentual,
  resumoPessoais,
  resumoTarefas,
} from "../src/lib/dashboard";
import {
  agendaDate,
  montarAgenda,
  agendaNoPeriodo,
} from "../src/lib/agenda-items";
import type { PersonalProject } from "../src/lib/personal-projects";

const today = "2026-11-01";
assert.equal(agendaDate("2026-11-01T02:59:00Z"), "2026-10-31");
assert.equal(agendaDate("2026-11-01T03:00:00Z"), today);
const tasks = resumoTarefas(
  [
    {
      id: "1",
      titulo: "Vencida",
      status: "pendente",
      data_finalizar: "2026-10-31",
    },
    {
      id: "2",
      titulo: "Concluída antiga",
      status: "concluida",
      data_finalizar: "2026-10-30",
    },
    { id: "3", titulo: "Hoje", status: "em_andamento", data_finalizar: today },
    { id: "4", titulo: "Sem prazo", status: "pendente", data_finalizar: null },
  ],
  today,
);
assert.equal(tasks.late, 1);
assert.equal(tasks.today, 1);
assert.equal(tasks.done, 1);
assert.equal(tasks.pct, 25);
assert.equal(tasks.next[0].id, "1");
assert.equal(tasks.next.at(-1)?.id, "4");
assert.equal(resumoTarefas([], today).pct, 0);
const project = (
  id: string,
  steps: PersonalProject["etapas"],
  prazo: string | null = null,
): PersonalProject => ({
  id,
  titulo: id,
  categoria: "Site",
  prazo,
  etapas: steps,
  notas: [],
});
const p = resumoPessoais(
  [
    project("Sem etapas", [], "2026-10-30"),
    project(
      "Concluído",
      [{ id: "1", titulo: "Feito", prazo: "2026-10-30", concluida: true }],
      "2026-10-30",
    ),
    project(
      "Etapa atrasada",
      [{ id: "2", titulo: "A fazer", prazo: "2026-10-31", concluida: false }],
      "2026-12-01",
    ),
  ],
  today,
);
assert.equal(p.completed, 1); // Uma lista vazia não implica conclusão.
assert.equal(p.late, 2); // Prazos do projeto e de etapas, sem contar concluídos.
assert.equal(p.pct, 50);
assert.equal(p.items.at(-1)?.id, "Concluído");
assert.equal(percentual(150, 100), 100);
assert.equal(percentual(-3, 10), 0);
assert(conversaAtiva({ status: "negociacao" }));
assert(!conversaAtiva({ status: "convertido" }));
assert(!conversaAtiva({ status: "perdido" }));
const week = focoSemana(
  [
    { finalizada_em: "2026-11-01T02:30:00Z", duracao_seg: 1800 },
    { finalizada_em: "2026-11-01T03:30:00Z", duracao_seg: "3600" },
    { finalizada_em: "2026-10-24T10:00:00Z", duracao_seg: 999 },
  ],
  today,
);
assert.equal(week.length, 7);
assert.equal(week[0].date, "2026-10-26");
assert.equal(week[5].seconds, 1800);
assert.equal(week[6].seconds, 3600);
assert.equal(
  week.reduce((s, d) => s + d.seconds, 0),
  5400,
);
const agenda = montarAgenda(
  [],
  [],
  [
    {
      id: "usd",
      descricao: "Parcela em dólar",
      valor: 120,
      valor_pago: 20,
      moeda: "USD",
      status: "parcial",
      vencimento: today,
      clientes: null,
    },
    {
      id: "paid",
      descricao: "Já paga",
      valor: 100,
      valor_pago: 100,
      moeda: "BRL",
      status: "pago",
      vencimento: today,
      clientes: null,
    },
  ],
);
const open = agendaNoPeriodo(agenda, today, today).filter((i) => !i.concluido);
assert.equal(open.length, 1);
assert.equal(open[0].moeda, "USD");
assert.equal(open[0].valor, 100);
console.log(
  "PASS: tarefas, projetos sem etapas, prazos, pipeline, semana na virada do mês e valores por moeda.",
);
