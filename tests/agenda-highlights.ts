import assert from "node:assert/strict";
import {
  agendaDestaques,
  montarAgenda,
  type AgendaEvent,
} from "../src/lib/agenda-items";

const event = (
  id: string,
  tipo_ev: AgendaEvent["tipo_ev"],
  quando: string,
  fim: string | null = null,
): AgendaEvent => ({
  id,
  titulo: id,
  tipo_ev,
  quando,
  fim,
  dia_inteiro: false,
  local: null,
  notas: null,
  projeto_id: null,
  valor: null,
  moeda: "BRL",
  pago: false,
});
const all = montarAgenda(
  [
    event("passado-antigo", "lembrete", "2026-10-01T12:00:00-03:00"),
    event("futuro", "lembrete", "2026-12-01T12:00:00-03:00"),
    event("hoje", "lembrete", "2026-10-27T12:00:00-03:00"),
    event("passado-recente", "data_importante", "2026-10-26T12:00:00-03:00"),
    event("reuniao", "reuniao", "2026-10-27T10:00:00-03:00"),
    event(
      "varios-dias",
      "bloco",
      "2026-10-26T09:00:00-03:00",
      "2026-10-28T09:00:00-03:00",
    ),
    event(
      "meia-noite-final",
      "bloco",
      "2026-10-26T20:00:00-03:00",
      "2026-10-27T00:00:00-03:00",
    ),
    event("fuso-local-ontem", "lembrete", "2026-10-27T02:00:00Z"),
  ],
  [{ id: "tarefa", titulo: "Tarefa", data_finalizar: "2026-10-27" }],
  [
    {
      id: "recebimento",
      descricao: "Receber",
      valor: 100,
      valor_pago: 0,
      moeda: "BRL",
      status: "pendente",
      vencimento: "2026-10-27",
      clientes: null,
    },
  ],
);
const { hoje, lembretes } = agendaDestaques(all, "2026-10-27");
assert.deepEqual(
  new Set(hoje.map((i) => i.sourceId)),
  new Set(["hoje", "reuniao", "varios-dias", "tarefa", "recebimento"]),
);
assert.equal(
  hoje.find((i) => i.sourceId === "varios-dias")?.horario,
  "Em andamento",
);
assert.equal(lembretes[0].sourceId, "hoje");
assert.equal(lembretes[1].sourceId, "futuro");
assert.equal(lembretes[lembretes.length - 1].sourceId, "passado-antigo");
assert.equal(
  lembretes.length,
  5,
  "all reminder dates retained, including important dates",
);
assert.equal(
  all[0].sourceId,
  "passado-antigo",
  "highlight sorting does not mutate calendar order",
);
assert.deepEqual(agendaDestaques([], "2026-10-27"), {
  hoje: [],
  lembretes: [],
});
console.log(
  "Agenda highlights passed: all periods, today, multi-day, timezone and past reminders.",
);
