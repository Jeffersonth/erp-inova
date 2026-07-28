"use client";

import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/components/app-providers";
import { salvarEvento, excluirEvento, moverEvento } from "@/lib/actions/agenda";
import { atualizarTarefaDia } from "@/lib/actions/tarefas-dia";
import type { Enums } from "@/lib/supabase/database.types";

type EventoTipo = Enums<"evento_tipo">;

export type Evento = {
  id: string;
  titulo: string;
  tipo_ev: EventoTipo;
  quando: string;
  fim: string | null;
  dia_inteiro: boolean;
  local: string | null;
  notas: string | null;
  projeto_id: string | null;
};

export type DiaTask = { id: string; titulo: string; data_finalizar: string };

const TIPO: Record<EventoTipo, { label: string; cor: string; tint: string }> = {
  reuniao: { label: "Reunião", cor: "#1D5BFF", tint: "rgba(29,91,255,.12)" },
  lembrete: { label: "Lembrete", cor: "#C77700", tint: "rgba(199,119,0,.12)" },
  bloco: { label: "Bloco de tempo", cor: "#7A5AF8", tint: "rgba(122,90,248,.12)" },
  entrega: { label: "Entrega", cor: "#0E9F6E", tint: "rgba(14,159,110,.12)" },
};
const TIPOS: EventoTipo[] = ["reuniao", "lembrete", "bloco", "entrega"];

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hm = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const pad = (n: number) => String(n).padStart(2, "0");

function gcalDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
function gcalLink(ev: Evento) {
  const inicio = new Date(ev.quando);
  const fim = ev.fim ? new Date(ev.fim) : new Date(inicio.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({ action: "TEMPLATE", text: ev.titulo });
  if (ev.dia_inteiro) {
    const d = startOfDay(inicio);
    params.set("dates", `${ymd(d).replace(/-/g, "")}/${ymd(addDays(d, 1)).replace(/-/g, "")}`);
  } else {
    params.set("dates", `${gcalDate(inicio)}/${gcalDate(fim)}`);
  }
  if (ev.notas) params.set("details", ev.notas);
  if (ev.local) params.set("location", ev.local);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function monthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
function weekDays(cursor: Date) {
  const start = addDays(cursor, -cursor.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function Agenda({
  eventosIniciais,
  tarefasIniciais,
  projetos,
}: {
  eventosIniciais: Evento[];
  tarefasIniciais: DiaTask[];
  projetos: { id: string; titulo: string }[];
}) {
  const [view, setView] = useState<"mes" | "semana" | "dia">("mes");
  const [cursor, setCursor] = useState(startOfDay(new Date()));
  const [eventos, setEventos] = useState<Evento[]>(eventosIniciais);
  const [tarefas, setTarefas] = useState<DiaTask[]>(tarefasIniciais);
  const [editing, setEditing] = useState<{ ev: Evento | null; dia: Date } | null>(null);
  const drag = useRef<{ kind: "evento" | "tarefa"; id: string } | null>(null);
  const hoje = startOfDay(new Date());

  const eventosDoDia = useMemo(() => {
    const map = new Map<string, Evento[]>();
    for (const e of eventos) {
      const k = ymd(new Date(e.quando));
      const arr = map.get(k);
      if (arr) arr.push(e);
      else map.set(k, [e]);
    }
    Array.from(map.values()).forEach((arr) => arr.sort((a, b) => a.quando.localeCompare(b.quando)));
    return map;
  }, [eventos]);

  const tarefasDoDia = useMemo(() => {
    const map = new Map<string, DiaTask[]>();
    for (const t of tarefas) {
      if (!t.data_finalizar) continue;
      const arr = map.get(t.data_finalizar);
      if (arr) arr.push(t);
      else map.set(t.data_finalizar, [t]);
    }
    return map;
  }, [tarefas]);

  const tituloPeriodo =
    view === "mes"
      ? `${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`
      : view === "semana"
        ? (() => {
            const dias = weekDays(cursor);
            return `${dias[0].getDate()}/${dias[0].getMonth() + 1} – ${dias[6].getDate()}/${dias[6].getMonth() + 1}`;
          })()
        : cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  function navegar(dir: -1 | 1) {
    if (view === "mes") setCursor(addMonths(cursor, dir));
    else if (view === "semana") setCursor(addDays(cursor, dir * 7));
    else setCursor(addDays(cursor, dir));
  }

  async function soltarEm(dia: Date) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === "tarefa") {
      const novo = ymd(dia);
      setTarefas((prev) => prev.map((t) => (t.id === d.id ? { ...t, data_finalizar: novo } : t)));
      await atualizarTarefaDia(d.id, { data_finalizar: novo });
    } else {
      const ev = eventos.find((e) => e.id === d.id);
      if (!ev) return;
      const orig = new Date(ev.quando);
      if (sameDay(orig, dia)) return;
      const novoInicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), orig.getHours(), orig.getMinutes());
      const deltaMs = novoInicio.getTime() - orig.getTime();
      const novoFim = ev.fim ? new Date(new Date(ev.fim).getTime() + deltaMs).toISOString() : null;
      const patch = { quando: novoInicio.toISOString(), fim: novoFim };
      setEventos((prev) => prev.map((e) => (e.id === ev.id ? { ...e, ...patch } : e)));
      await moverEvento(ev.id, patch);
    }
  }

  function EventoChip({ ev, compact }: { ev: Evento; compact?: boolean }) {
    const meta = TIPO[ev.tipo_ev];
    return (
      <button
        draggable
        onDragStart={() => (drag.current = { kind: "evento", id: ev.id })}
        onClick={(e) => {
          e.stopPropagation();
          setEditing({ ev, dia: new Date(ev.quando) });
        }}
        className="flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11.5px] font-medium"
        style={{ background: meta.tint, color: meta.cor }}
        title={ev.titulo}
      >
        {!ev.dia_inteiro && !compact && <span className="tabular-nums opacity-80">{hm(new Date(ev.quando))}</span>}
        <span className="truncate">{ev.titulo}</span>
      </button>
    );
  }

  function TarefaChip({ t }: { t: DiaTask }) {
    return (
      <div
        draggable
        onDragStart={() => (drag.current = { kind: "tarefa", id: t.id })}
        className="flex w-full items-center gap-1 truncate rounded border border-dashed border-line bg-soft px-1.5 py-0.5 text-[11.5px] text-mut"
        title={`Tarefa do dia: ${t.titulo}`}
      >
        <span>☑</span>
        <span className="truncate">{t.titulo}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => navegar(-1)} className="flex size-7 items-center justify-center rounded-lg border border-line text-mut hover:border-brand hover:text-ink">‹</button>
          <button onClick={() => setCursor(hoje)} className="rounded-lg border border-line px-2.5 py-1 text-[12.5px] font-semibold text-ink hover:border-brand">Hoje</button>
          <button onClick={() => navegar(1)} className="flex size-7 items-center justify-center rounded-lg border border-line text-mut hover:border-brand hover:text-ink">›</button>
        </div>
        <b className="text-[14px] capitalize text-ink">{tituloPeriodo}</b>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-line p-0.5">
          {(["mes", "semana", "dia"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-2.5 py-1 text-[12.5px] font-semibold capitalize transition-colors ${
                view === v ? "bg-brand text-white" : "text-mut hover:text-ink"
              }`}
            >
              {v === "mes" ? "Mês" : v}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditing({ ev: null, dia: cursor })}
          className="rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-brand-dark"
        >
          + Evento
        </button>
      </div>

      {/* Mês */}
      {view === "mes" && (
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          <div className="grid grid-cols-7 border-b border-line bg-soft text-[11px] font-semibold tracking-[0.05em] text-mut">
            {WD.map((d) => (
              <div key={d} className="px-2 py-1.5 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid(cursor).map((dia, i) => {
              const doMes = dia.getMonth() === cursor.getMonth();
              const evs = eventosDoDia.get(ymd(dia)) ?? [];
              const tks = tarefasDoDia.get(ymd(dia)) ?? [];
              const ehHoje = sameDay(dia, hoje);
              return (
                <div
                  key={i}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => soltarEm(dia)}
                  onClick={() => setEditing({ ev: null, dia })}
                  className={`min-h-[92px] cursor-pointer border-b border-r border-line p-1 transition-colors last:border-r-0 hover:bg-soft ${
                    doMes ? "" : "bg-soft-2/50"
                  }`}
                >
                  <div className="mb-0.5 flex justify-end">
                    <span
                      className={`flex size-[18px] items-center justify-center rounded-full text-[11.5px] font-semibold ${
                        ehHoje ? "bg-brand text-white" : doMes ? "text-ink" : "text-mut"
                      }`}
                    >
                      {dia.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {evs.slice(0, 3).map((ev) => (
                      <EventoChip key={ev.id} ev={ev} />
                    ))}
                    {tks.slice(0, 2).map((t) => (
                      <TarefaChip key={t.id} t={t} />
                    ))}
                    {evs.length + tks.length > 5 && (
                      <span className="px-1 text-[11px] text-mut">+{evs.length + tks.length - 5} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Semana */}
      {view === "semana" && (
        <div className="thin-scroll overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 gap-2">
            {weekDays(cursor).map((dia, i) => {
              const evs = eventosDoDia.get(ymd(dia)) ?? [];
              const tks = tarefasDoDia.get(ymd(dia)) ?? [];
              const ehHoje = sameDay(dia, hoje);
              return (
                <div
                  key={i}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => soltarEm(dia)}
                  className={`flex min-h-[300px] flex-col gap-1 rounded-lg border p-1.5 ${ehHoje ? "border-brand/50 bg-brand/[0.03]" : "border-line bg-card"}`}
                >
                  <button
                    onClick={() => setEditing({ ev: null, dia })}
                    className="mb-0.5 flex items-center justify-between px-0.5 text-left"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-mut">{WD[dia.getDay()]}</span>
                    <span className={`text-[13px] font-bold ${ehHoje ? "text-brand" : "text-ink"}`}>{dia.getDate()}</span>
                  </button>
                  {evs.map((ev) => (
                    <EventoChip key={ev.id} ev={ev} />
                  ))}
                  {tks.map((t) => (
                    <TarefaChip key={t.id} t={t} />
                  ))}
                  {evs.length + tks.length === 0 && <div className="px-1 text-[11.5px] text-mut">—</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dia */}
      {view === "dia" && (
        <div className="rounded-xl border border-line bg-card p-3">
          {(() => {
            const evs = eventosDoDia.get(ymd(cursor)) ?? [];
            const tks = tarefasDoDia.get(ymd(cursor)) ?? [];
            if (evs.length === 0 && tks.length === 0) {
              return (
                <button
                  onClick={() => setEditing({ ev: null, dia: cursor })}
                  className="w-full rounded-lg border border-dashed border-line py-10 text-center text-[13px] text-mut hover:border-brand hover:text-brand"
                >
                  Nada agendado neste dia. Clique para adicionar um evento.
                </button>
              );
            }
            return (
              <div className="flex flex-col gap-1.5">
                {tks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-soft px-3 py-2 text-[13px] text-mut">
                    <span>☑ Tarefa do dia</span>
                    <span className="text-ink">{t.titulo}</span>
                  </div>
                ))}
                {evs.map((ev) => {
                  const meta = TIPO[ev.tipo_ev];
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setEditing({ ev, dia: new Date(ev.quando) })}
                      className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left hover:border-brand"
                    >
                      <span className="w-[92px] flex-none text-[12.5px] font-semibold tabular-nums text-mut">
                        {ev.dia_inteiro ? "dia inteiro" : `${hm(new Date(ev.quando))}${ev.fim ? `–${hm(new Date(ev.fim))}` : ""}`}
                      </span>
                      <span className="size-2 flex-none rounded-full" style={{ background: meta.cor }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold text-ink">{ev.titulo}</div>
                        {(ev.local || ev.notas) && (
                          <div className="truncate text-[12px] text-mut">{[ev.local, ev.notas].filter(Boolean).join(" · ")}</div>
                        )}
                      </div>
                      <span className="flex-none rounded-full px-2 py-px text-[11px] font-semibold" style={{ background: meta.tint, color: meta.cor }}>
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Legenda + dica */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12px] text-mut">
        {TIPOS.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: TIPO[t].cor }} />
            {TIPO[t].label}
          </span>
        ))}
        <span className="ml-auto">Arraste eventos e tarefas (☑) para outros dias para reagendar.</span>
      </div>

      <EventoDialog
        state={editing}
        projetos={projetos}
        onClose={() => setEditing(null)}
        onSaved={(ev, isNew) =>
          setEventos((prev) => (isNew ? [...prev, ev] : prev.map((e) => (e.id === ev.id ? ev : e))))
        }
        onDeleted={(id) => setEventos((prev) => prev.filter((e) => e.id !== id))}
      />
    </div>
  );
}

function EventoDialog({
  state,
  projetos,
  onClose,
  onSaved,
  onDeleted,
}: {
  state: { ev: Evento | null; dia: Date } | null;
  projetos: { id: string; titulo: string }[];
  onClose: () => void;
  onSaved: (ev: Evento, isNew: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const { toast } = useApp();
  const ev = state?.ev ?? null;
  const dia = state?.dia ?? new Date();

  const inicioDate = ev ? new Date(ev.quando) : dia;
  const fimDate = ev?.fim ? new Date(ev.fim) : null;

  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const titulo = String(form.get("titulo") ?? "").trim();
    if (!titulo) return;
    const data = String(form.get("data") ?? "");
    const diaInteiro = form.get("dia_inteiro") === "on";
    const horaIni = String(form.get("hora_ini") ?? "09:00");
    const horaFim = String(form.get("hora_fim") ?? "");

    const [y, mo, d] = data.split("-").map(Number);
    const quando = diaInteiro
      ? new Date(y, mo - 1, d, 0, 0)
      : new Date(y, mo - 1, d, Number(horaIni.split(":")[0]), Number(horaIni.split(":")[1]));
    const fim =
      !diaInteiro && horaFim
        ? new Date(y, mo - 1, d, Number(horaFim.split(":")[0]), Number(horaFim.split(":")[1])).toISOString()
        : null;

    const payload = {
      titulo,
      tipo_ev: form.get("tipo_ev") as EventoTipo,
      quando: quando.toISOString(),
      fim,
      dia_inteiro: diaInteiro,
      local: String(form.get("local") ?? "").trim() || null,
      notas: String(form.get("notas") ?? "").trim() || null,
      projeto_id: String(form.get("projeto_id") ?? "") || null,
    };

    setLoading(true);
    const { data: row, error } = await salvarEvento(ev?.id ?? null, payload);
    setLoading(false);
    if (error) return toast(error);
    if (ev) {
      onSaved({ ...ev, ...payload }, false);
      toast("✓ Evento atualizado");
    } else if (row) {
      onSaved(row as Evento, true);
      toast("✓ Evento criado");
    }
    onClose();
  }

  async function excluir() {
    if (!ev) return;
    if (!confirm(`Excluir o evento "${ev.titulo}"?`)) return;
    setLoading(true);
    await excluirEvento(ev.id);
    setLoading(false);
    onDeleted(ev.id);
    onClose();
    toast("✓ Evento excluído");
  }

  const field = "mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand";
  const label = "text-[11.5px] font-semibold text-mut";

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
        {state && (
          <>
            <DialogTitle className="text-[15.5px] font-bold text-ink">{ev ? "Editar evento" : "Novo evento"}</DialogTitle>
            <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
              <div>
                <label className={label}>Título *</label>
                <input name="titulo" required defaultValue={ev?.titulo ?? ""} placeholder="Ex: Reunião com cliente" className={field} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={label}>Tipo</label>
                  <select name="tipo_ev" defaultValue={ev?.tipo_ev ?? "reuniao"} className={field}>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>{TIPO[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Data</label>
                  <input name="data" type="date" defaultValue={ymd(inicioDate)} className={field} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={label}>Início</label>
                  <input name="hora_ini" type="time" defaultValue={ev && !ev.dia_inteiro ? hm(inicioDate) : "09:00"} className={field} />
                </div>
                <div>
                  <label className={label}>Fim</label>
                  <input name="hora_fim" type="time" defaultValue={fimDate ? hm(fimDate) : ""} className={field} />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                <input type="checkbox" name="dia_inteiro" defaultChecked={ev?.dia_inteiro ?? false} className="accent-brand" />
                Dia inteiro
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={label}>Local</label>
                  <input name="local" defaultValue={ev?.local ?? ""} placeholder="Meet, escritório…" className={field} />
                </div>
                <div>
                  <label className={label}>Projeto</label>
                  <select name="projeto_id" defaultValue={ev?.projeto_id ?? ""} className={field}>
                    <option value="">Nenhum</option>
                    {projetos.map((p) => (
                      <option key={p.id} value={p.id}>{p.titulo}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={label}>Notas</label>
                <textarea name="notas" rows={2} defaultValue={ev?.notas ?? ""} className={`${field} resize-none`} />
              </div>

              {ev && (
                <a
                  href={gcalLink(ev)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-line px-3 py-2 text-center text-[12.5px] font-semibold text-ink transition-colors hover:border-brand"
                >
                  📅 Adicionar ao Google Calendar
                </a>
              )}

              <div className="mt-1 flex items-center justify-between gap-2">
                {ev ? (
                  <button type="button" onClick={excluir} disabled={loading} className="rounded-lg border border-danger/40 px-3.5 py-[7px] text-[13px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60">
                    Excluir
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={onClose} className="rounded-lg border border-line px-3.5 py-[7px] text-[13px] font-semibold text-ink transition-colors hover:border-brand">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60">
                    {loading ? "Salvando…" : ev ? "Salvar" : "Criar evento"}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
