"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AgendaItemList } from "@/components/agenda-item-list";
import { AgendaHighlights } from "@/components/agenda-highlights";
import { salvarEvento, excluirEvento, marcarPagamentoAgenda, type EventoInput } from "@/lib/actions/agenda";
import { AGENDA_TIPOS, agendaDate, agendaTime, agendaMoney, montarAgenda, agendaNoPeriodo, validAgendaDate, type AgendaEvent, type AgendaTask, type AgendaRecebimento, type AgendaItem, type EventoTipo } from "@/lib/agenda-items";

export type Evento = AgendaEvent;
export type DiaTask = AgendaTask;
const field = "mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-brand";
const button = "rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-brand disabled:opacity-50";
const ymd = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDay = (day: string) => new Date(`${day}T12:00:00`);
const addDays = (date: Date, count: number) => { const result = new Date(date); result.setDate(result.getDate() + count); return result; };
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const eventTypes: EventoTipo[] = ["data_importante", "pagamento", "reuniao", "lembrete", "entrega", "bloco"];

export function Agenda({ eventosIniciais, tarefasIniciais, recebimentos, projetos, initialDay, initialItem }: {
  eventosIniciais: AgendaEvent[]; tarefasIniciais: AgendaTask[]; recebimentos: AgendaRecebimento[];
  projetos: { id: string; titulo: string }[]; initialDay: string; initialItem?: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"dia" | "semana" | "mes">("mes");
  const [cursor, setCursor] = useState(fromDay(initialDay));
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [events, setEvents] = useState(eventosIniciais);
  const [filter, setFilter] = useState("todos");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<{ ev: AgendaEvent | null; dia: string; tipo: EventoTipo } | null>(() => {
    const ev = eventosIniciais.find(e => e.id === initialItem);
    return ev ? { ev, dia: agendaDate(ev.quando), tipo: ev.tipo_ev } : null;
  });
  const all = useMemo(() => montarAgenda(events, tarefasIniciais, recebimentos), [events, tarefasIniciais, recebimentos]);
  const items = all.filter(item => filter === "todos" || (filter === "pagamentos" ? ["pagamento", "recebimento"].includes(item.tipo) : item.tipo === filter));
  const [today, setToday] = useState(() => agendaDate());
  useEffect(() => {
    const update = () => setToday(agendaDate());
    const interval = setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, []);
  const weekStart = addDays(cursor, -cursor.getDay());
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12);
  const start = view === "mes" ? ymd(monthStart) : view === "semana" ? ymd(weekStart) : ymd(cursor);
  const end = view === "mes" ? ymd(monthEnd) : view === "semana" ? ymd(addDays(weekStart, 6)) : ymd(cursor);
  const periodItems = agendaNoPeriodo(items, start, end);
  const periodLabel = view === "mes" ? cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : view === "dia" ? cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : `${fromDay(start).toLocaleDateString("pt-BR")} a ${fromDay(end).toLocaleDateString("pt-BR")}`;
  const days = view === "dia" ? [cursor] : view === "semana" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : Array.from({ length: Math.ceil((monthStart.getDay() + monthEnd.getDate()) / 7) * 7 }, (_, i) => addDays(monthStart, i - monthStart.getDay()));
  const groups = Array.from(new Set(periodItems.map(item => item.data < start ? start : item.data))).sort();
  function go(day: string) { setCursor(fromDay(day)); setSelectedDay(day); }
  function navigate(direction: number) {
    const date = view === "mes" ? new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1, 12) : addDays(cursor, direction * (view === "semana" ? 7 : 1));
    go(ymd(date));
  }
  function edit(item: AgendaItem) {
    const ev = events.find(e => e.id === item.sourceId);
    if (ev) setEditing({ ev, dia: agendaDate(ev.quando), tipo: ev.tipo_ev });
  }
  async function paid(item: AgendaItem, value: boolean) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await marcarPagamentoAgenda(item.sourceId, value);
      if (result.error) { setMessage(result.error); return; }
      setEvents(old => old.map(ev => ev.id === item.sourceId ? { ...ev, pago: value } : ev));
      setMessage(value ? "Pagamento marcado como pago." : "Pagamento marcado como pendente.");
      router.refresh();
    } catch { setMessage("Falha de conexão. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-col gap-4">
    <AgendaHighlights items={all} today={today} onEdit={edit} onPago={paid} busy={busy} onAdd={() => setEditing({ ev: null, dia: today, tipo: "lembrete" })}/>
    <div className="flex flex-wrap items-center gap-2">
      <button aria-label="Período anterior" className={button} onClick={() => navigate(-1)}>‹</button><button className={button} onClick={() => go(today)}>Hoje</button><button aria-label="Próximo período" className={button} onClick={() => navigate(1)}>›</button>
      <h2 className="text-sm font-bold capitalize text-ink">{periodLabel}</h2>
      <div className="ml-auto flex rounded-lg border border-line p-1">{(["dia", "semana", "mes"] as const).map(v => <button key={v} aria-pressed={view === v} className={`rounded-md px-3 py-1 text-xs font-semibold ${view === v ? "bg-brand text-white" : "text-mut"}`} onClick={() => setView(v)}>{v === "mes" ? "Mês" : v === "dia" ? "Dia" : "Semana"}</button>)}</div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-mut">Mostrar <select className="ml-1 rounded-lg border border-line bg-card px-2 py-2 text-ink" value={filter} onChange={e => setFilter(e.target.value)}><option value="todos">Tudo</option><option value="data_importante">Datas importantes</option><option value="pagamentos">Pagamentos e recebimentos</option><option value="lembrete">Lembretes</option><option value="reuniao">Reuniões</option><option value="tarefa">Tarefas</option></select></label>
      <button disabled={busy} className={`${button} ml-auto bg-brand text-white`} onClick={() => setEditing({ ev: null, dia: selectedDay, tipo: "data_importante" })}>+ Data importante</button>
      <button disabled={busy} className={button} onClick={() => setEditing({ ev: null, dia: selectedDay, tipo: "pagamento" })}>+ Pagamento</button>
      <button disabled={busy} className={button} onClick={() => setEditing({ ev: null, dia: selectedDay, tipo: "reuniao" })}>+ Compromisso</button>
    </div>
    <p className="text-xs text-mut">Os valores a receber vêm do Financeiro. Cadastre aqui suas contas a pagar e datas importantes.</p>
    {message && <p role="status" className="text-sm text-mut">{message}</p>}
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
    <section aria-label="Calendário" className="erp-card min-w-0 overflow-hidden xl:max-h-[calc(100dvh-340px)] xl:overflow-y-auto">
      <div className="overflow-x-auto"><div className={view === "dia" ? "" : view === "semana" ? "min-w-[560px]" : "min-w-[420px]"}>
        {view !== "dia" && <div className="grid grid-cols-7 bg-soft text-center text-xs font-semibold text-mut">{weekdays.map(day => <div key={day} className="p-2">{day}</div>)}</div>}
        <div className={view === "dia" ? "" : "grid grid-cols-7"}>{days.map(day => {
          const key = ymd(day); const dayItems = agendaNoPeriodo(items, key, key); const shown = view === "mes" ? dayItems.slice(0, 1) : dayItems;
          return <div key={key} className={`${view === "mes" ? "h-[76px] overflow-hidden p-1 xl:h-[clamp(48px,calc((100dvh-380px)/6),76px)]" : "min-h-[110px] p-2"} min-w-0 border-b border-r border-line ${key === today ? "bg-[#FCE9F2] ring-2 ring-inset ring-brand/50" : key === selectedDay ? "bg-brand/[0.04] ring-1 ring-inset ring-brand/30" : day.getMonth() !== cursor.getMonth() && view === "mes" ? "bg-soft" : ""}`}>
            <div className="mb-1 flex items-center justify-between gap-1"><button aria-label={`Ver dia ${day.toLocaleDateString("pt-BR")}`} onClick={() => { go(key); setView("dia"); }} className={`flex size-[22px] items-center justify-center rounded-full text-[11px] font-bold ${key === today ? "bg-brand text-white" : "text-ink hover:bg-soft"}`}>{day.getDate()}</button>{dayItems.length > shown.length && <button title={`Ver todos os ${dayItems.length} itens do dia`} aria-label={`Ver mais ${dayItems.length - shown.length} itens de ${day.toLocaleDateString("pt-BR")}`} className="text-[9px] font-semibold text-brand" onClick={() => { go(key); setView("dia"); }}>+{dayItems.length - shown.length}</button>}</div>
            <div className="space-y-1">{shown.map(item => {
              const meta = AGENDA_TIPOS[item.tipo];
              const content = <><span className="block truncate">{item.horario !== "Dia inteiro" ? `${item.horario} ` : ""}{item.concluido ? "✓ " : ""}{item.titulo}{view === "mes" && item.valor !== null ? ` · ${agendaMoney(item.valor, item.moeda)}` : ""}</span>{view !== "mes" && item.valor !== null && <span className="block text-[10px] font-bold">{agendaMoney(item.valor, item.moeda)}</span>}</>;
              const cls = `block w-full rounded px-1.5 ${view === "mes" ? "py-0.5 text-[10px]" : "py-1 text-[11px]"} text-left ${item.concluido ? "opacity-60" : ""}`;
              return item.origem === "evento" ? <button key={item.id} title={`${meta.label}: ${item.titulo}`} className={cls} style={{ background: meta.tint, color: meta.cor }} onClick={() => edit(item)}>{content}</button> : <Link key={item.id} title={item.titulo} className={cls} style={{ background: meta.tint, color: meta.cor }} href={item.origem === "recebimento" ? "/financeiro" : "/tarefas"}>{content}</Link>;
            })}</div>
            {view === "dia" && !dayItems.length && <p className="py-5 text-sm text-mut">Nenhum item para este dia.</p>}
          </div>;
        })}</div>
      </div></div>
    </section>
    <section aria-label="Lista da agenda" className="erp-card erp-card--lavender flex min-w-0 flex-col p-4 xl:max-h-[calc(100dvh-340px)]">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-ink">Lista do período</h2><span className="text-xs text-mut">{periodItems.length} item(ns)</span></div>
      {!groups.length && <p className="py-5 text-center text-sm text-mut">Nenhuma data ou pagamento neste período.</p>}
      <div className="thin-scroll min-h-0 space-y-4 xl:overflow-y-auto xl:pr-1">{groups.map(day => <div key={day}><h3 className={`mb-2 text-xs font-bold capitalize ${day === today ? "text-brand" : "text-mut"}`}>{day === today && <span className="mr-2 rounded-full bg-brand px-2 py-0.5 text-[10px] uppercase text-white">Hoje</span>}{fromDay(day).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h3><AgendaItemList items={periodItems.filter(item => (item.data < start ? start : item.data) === day)} onEdit={edit} onPago={paid} busy={busy} highlightDay={today} /></div>)}</div>
    </section>
    </div>
    {editing && <EventoDialog key={`${editing.ev?.id ?? "novo"}-${editing.dia}-${editing.tipo}`} state={editing} projetos={projetos} onClose={() => setEditing(null)} onSaved={ev => { setEvents(old => old.some(e => e.id === ev.id) ? old.map(e => e.id === ev.id ? ev : e) : [...old, ev]); setEditing(null); setMessage("Item salvo na agenda e na tela Hoje."); router.refresh(); }} onDeleted={id => { setEvents(old => old.filter(e => e.id !== id)); setEditing(null); router.refresh(); }} />}
  </div>;
}

function EventoDialog({ state, projetos, onClose, onSaved, onDeleted }: {
  state: { ev: AgendaEvent | null; dia: string; tipo: EventoTipo }; projetos: { id: string; titulo: string }[];
  onClose: () => void; onSaved: (event: AgendaEvent) => void; onDeleted: (id: string) => void;
}) {
  const ev = state.ev;
  const [tipo, setTipo] = useState(state.tipo);
  const [allDay, setAllDay] = useState(ev?.dia_inteiro ?? state.tipo !== "reuniao");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const googleLink = ev ? (() => {
    const compact = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const dates = ev.dia_inteiro
      ? `${agendaDate(ev.quando).replace(/-/g, "")}/${ymd(addDays(fromDay(agendaDate(ev.quando)), 1)).replace(/-/g, "")}`
      : `${compact(ev.quando)}/${compact(ev.fim ?? new Date(new Date(ev.quando).getTime() + 3600000).toISOString())}`;
    return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text: ev.titulo, dates, details: ev.notas ?? "", location: ev.local ?? "" })}`;
  })() : null;
  function close() { if (!busy && (!dirty || confirm("Descartar as alterações não salvas?"))) onClose(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    const day = String(form.get("data")); const endDay = String(form.get("data_fim") || day);
    const startTime = allDay ? "00:00" : String(form.get("hora_ini") || "09:00");
    const endTime = !allDay ? String(form.get("hora_fim") || "") : "";
    if (!validAgendaDate(day) || !validAgendaDate(endDay) || !/^\d{2}:\d{2}$/.test(startTime) || (endTime && !/^\d{2}:\d{2}$/.test(endTime))) { setError("Confira a data e os horários."); return; }
    const startDate = new Date(`${day}T${startTime}:00-03:00`);
    const endDate = allDay ? null : endTime ? new Date(`${endDay}T${endTime}:00-03:00`) : null;
    if (!Number.isFinite(startDate.getTime()) || (endDate && (!Number.isFinite(endDate.getTime()) || endDate <= startDate))) { setError("O horário final deve ser posterior ao início."); return; }
    const rawAmount = String(form.get("valor") ?? "");
    const payload: EventoInput = {
      titulo: String(form.get("titulo") || "").trim(), tipo_ev: tipo,
      quando: startDate.toISOString(), fim: endDate?.toISOString() ?? null, dia_inteiro: allDay,
      local: String(form.get("local") || "").trim() || null, notas: String(form.get("notas") || "").trim() || null,
      projeto_id: String(form.get("projeto_id") || "") || null,
      valor: tipo === "pagamento" && rawAmount ? Number(rawAmount) : null,
      moeda: String(form.get("moeda") || "BRL") as EventoInput["moeda"], pago: tipo === "pagamento" && form.get("pago") === "on",
    };
    setBusy(true); setError("");
    try { const result = await salvarEvento(ev?.id ?? null, payload); if (result.error || !result.data) { setError(result.error || "Não foi possível salvar."); return; } onSaved(result.data); }
    catch { setError("Falha de conexão. Suas alterações continuam no formulário."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!ev || busy || !confirm(`Excluir "${ev.titulo}" da agenda?`)) return;
    setBusy(true); setError("");
    try { const result = await excluirEvento(ev.id); if (result.error) setError(result.error); else onDeleted(ev.id); }
    catch { setError("Não foi possível excluir. Tente novamente."); } finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
    <DialogTitle>{ev ? "Editar item" : tipo === "pagamento" ? "Novo pagamento" : tipo === "lembrete" ? "Novo lembrete" : "Nova data ou compromisso"}</DialogTitle><DialogDescription>O item também aparece no Hoje na data escolhida.</DialogDescription>
    <form onSubmit={submit} onChange={() => setDirty(true)} className="space-y-3"><fieldset disabled={busy} className="space-y-3">
      <label className="block text-xs font-semibold text-mut">Título<input name="titulo" required autoFocus maxLength={200} defaultValue={ev?.titulo} className={field} placeholder={tipo === "pagamento" ? "Ex.: Internet, aluguel, assinatura…" : "Ex.: Aniversário, renovação, reunião…"} /></label>
      <label className="block text-xs font-semibold text-mut">Tipo<select name="tipo" className={field} value={tipo} onChange={e => setTipo(e.target.value as EventoTipo)}>{eventTypes.map(type => <option key={type} value={type}>{type === "pagamento" ? "Pagamento a fazer" : AGENDA_TIPOS[type].label}</option>)}</select></label>
      <label className="block text-xs font-semibold text-mut">Data<input required name="data" type="date" className={field} defaultValue={state.dia} /></label>
      <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" className="accent-brand" checked={allDay} onChange={e => setAllDay(e.target.checked)} />Dia inteiro</label>
      {!allDay && <div className="grid grid-cols-2 gap-3"><label className="text-xs text-mut">Início<input name="hora_ini" type="time" required className={field} defaultValue={ev && !ev.dia_inteiro ? agendaTime(ev.quando) : "09:00"} /></label><label className="text-xs text-mut">Fim (opcional)<input name="hora_fim" type="time" className={field} defaultValue={ev?.fim ? agendaTime(ev.fim) : ""} /></label><label className="col-span-2 text-xs text-mut">Data final (opcional)<input name="data_fim" type="date" className={field} defaultValue={ev?.fim ? agendaDate(ev.fim) : ""} /></label></div>}
      {tipo === "pagamento" && <div className="space-y-3 rounded-lg bg-soft p-3"><div className="grid grid-cols-2 gap-3"><label className="text-xs text-mut">Valor (opcional)<input name="valor" type="number" min="0" max="999999999999.99" step="0.01" className={field} defaultValue={ev?.valor ?? ""} /></label><label className="text-xs text-mut">Moeda<select name="moeda" className={field} defaultValue={ev?.moeda ?? "BRL"}><option value="BRL">Real (R$)</option><option value="USD">Dólar (US$)</option><option value="EUR">Euro (€)</option></select></label></div><label className="flex items-center gap-2 text-sm text-ink"><input name="pago" type="checkbox" defaultChecked={ev?.pago} className="accent-brand" />Já foi pago</label></div>}
      <label className="block text-xs font-semibold text-mut">Local (opcional)<input name="local" maxLength={500} defaultValue={ev?.local ?? ""} className={field} /></label>
      <label className="block text-xs font-semibold text-mut">Projeto de trabalho (opcional)<select name="projeto_id" defaultValue={ev?.projeto_id ?? ""} className={field}><option value="">Nenhum</option>{projetos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}</select></label>
      <label className="block text-xs font-semibold text-mut">Anotações<textarea name="notas" maxLength={10000} rows={3} defaultValue={ev?.notas ?? ""} className={field} /></label>
    </fieldset>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {googleLink && <a href={googleLink} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-semibold text-brand">Adicionar ao Google Calendar →</a>}
    <div className="flex flex-wrap justify-end gap-2">{ev && <button type="button" disabled={busy} className={`${button} mr-auto text-danger`} onClick={remove}>Excluir</button>}<button type="button" disabled={busy} className={button} onClick={close}>Cancelar</button><button disabled={busy} className={`${button} bg-brand text-white`} type="submit">{busy ? "Salvando…" : "Salvar"}</button></div>
    </form>
  </DialogContent></Dialog>;
}
