"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Flower2,
  Leaf,
  Pencil,
  Plus,
  RotateCcw,
  Sprout,
  Trophy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { saveHabit, checkHabit, archiveHabit } from "@/lib/actions/habits";
import { agendaDate } from "@/lib/agenda-items";
import {
  HABIT_COLORS,
  habitDay,
  habitDateLabel,
  habitGrowth,
  habitMonth,
  habitMonthDays,
  habitStats,
  type Habit,
  type HabitCheck,
} from "@/lib/habits";

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(month + "-01T12:00:00Z"));
const weekday = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" })
    .format(new Date(date + "T12:00:00Z"))
    .replace(".", "");
const field =
  "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand";
type Edit = { habit: Habit | null; preset?: string };
function Plant({
  total,
  color,
  size = 28,
}: {
  total: number;
  color: string;
  size?: number;
}) {
  const Icon = total >= 21 ? Flower2 : total >= 7 ? Leaf : Sprout;
  return (
    <Icon size={size} strokeWidth={1.6} style={{ color }} aria-hidden="true" />
  );
}

export function HabitsGarden({
  habits,
  initialChecks,
  today: initialToday,
}: {
  habits: Habit[];
  initialChecks: HabitCheck[];
  today: string;
}) {
  const router = useRouter();
  const calendarRef = useRef<HTMLElement>(null);
  function viewCalendar(id: string) {
    setSelected(id);
    requestAnimationFrame(() =>
      calendarRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      }),
    );
  }
  const [today, setToday] = useState(initialToday);
  const [checks, setChecks] = useState(initialChecks);
  const [month, setMonth] = useState(initialToday.slice(0, 7));
  const [selected, setSelected] = useState("");
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<Edit | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [archiving, setArchiving] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const tick = () => setToday(agendaDate());
    const id = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  const active = habits.filter((h) => !h.arquivado);
  const visible = habits.filter((h) => h.arquivado === archived);
  const chosen = visible.find((h) => h.id === selected) ?? visible[0] ?? null;
  const stats = useMemo(
    () =>
      new Map(habits.map((h) => [h.id, habitStats(h, checks, today, month)])),
    [habits, checks, today, month],
  );
  const completedToday = active.filter(
    (h) => stats.get(h.id)!.doneToday,
  ).length;
  const percent = active.length
    ? Math.round((completedToday / active.length) * 100)
    : 0;
  const best = Math.max(0, ...habits.map((h) => stats.get(h.id)!.best));
  const total = habits.reduce((sum, h) => sum + stats.get(h.id)!.total, 0);
  const recent = Array.from({ length: 7 }, (_, i) => habitDay(today, i - 6));
  const calendar = habitMonthDays(month);
  const selectedStats = chosen ? stats.get(chosen.id)! : null;
  async function toggle(habit: Habit, day: string) {
    const key = `${habit.id}:${day}`;
    if (
      habit.arquivado ||
      pending.includes(key) ||
      day < habit.inicio ||
      day > agendaDate()
    )
      return;
    const had = checks.some((c) => c.habito_id === habit.id && c.data === day);
    setPending((p) => [...p, key]);
    setMessage("");
    setChecks((p) =>
      had
        ? p.filter((c) => !(c.habito_id === habit.id && c.data === day))
        : [...p, { habito_id: habit.id, data: day }],
    );
    try {
      const result = await checkHabit(habit.id, day, !had);
      if (result.error) throw new Error(result.error);
      setMessage(
        had
          ? "Marcação desfeita."
          : "Mais um dia cultivado. Pequenos passos contam! ",
      );
    } catch (error) {
      setChecks((p) =>
        had
          ? [
              ...p.filter((c) => !(c.habito_id === habit.id && c.data === day)),
              { habito_id: habit.id, data: day },
            ]
          : p.filter((c) => !(c.habito_id === habit.id && c.data === day)),
      );
      setMessage(
        (error as Error).message || "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setPending((p) => p.filter((k) => k !== key));
    }
  }
  async function archive(habit: Habit) {
    if (archiving) return;
    setArchiving(habit.id);
    try {
      const result = await archiveHabit(habit.id, !habit.arquivado);
      setMessage(
        result.error ??
          (habit.arquivado
            ? "Hábito voltou ao seu jardim."
            : "Hábito arquivado. Seu histórico foi preservado."),
      );
      if (!result.error) router.refresh();
    } catch {
      setMessage("Falha de conexão. Tente novamente.");
    } finally {
      setArchiving("");
    }
  }
  return (
    <div className="space-y-5 habits-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.17em] text-brand">
            <Sprout size={13} />
            Pequenos passos, raízes fortes
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Hábitos
          </h1>
          <p className="mt-1 text-[13px] text-mut">
            Cultive a rotina que você quer viver, um dia de cada vez.
          </p>
        </div>
        <button
          onClick={() => setEditing({ habit: null })}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white"
        >
          <Plus size={16} />
          Novo hábito
        </button>
      </header>
      <section
        aria-label="Seu jardim de hoje"
        className="habits-hero relative isolate overflow-hidden rounded-[22px] bg-[#172A24] p-5 text-white sm:p-6"
      >
        <div
          aria-hidden="true"
          className="habits-leaf absolute -right-5 -top-8 -z-10 text-[#80CDA0]/10"
        >
          <Flower2 size={230} strokeWidth={1} />
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative flex size-24 shrink-0 items-center justify-center">
            <svg
              viewBox="0 0 96 96"
              className="size-24 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="#ffffff19"
                strokeWidth="7"
              />
              <circle
                className="habits-ring"
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="#8CD7A8"
                strokeWidth="7"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${percent} 100`}
              />
            </svg>
            <div className="absolute text-center">
              <b className="block text-2xl font-extrabold tabular-nums">
                {completedToday}
                <span className="text-sm font-normal text-[#BBD0C5]">
                  /{active.length}
                </span>
              </b>
              <span className="text-[10px] text-[#BBD0C5]">hoje</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A9CFB9]">
              Seu jardim de constância
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {!active.length
                ? "Toda mudança começa com uma semente."
                : completedToday === active.length
                  ? "Seu jardim floresceu hoje!"
                  : "Um pequeno cuidado hoje faz diferença."}
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#CADCD1]">
              {!active.length
                ? "Escolha algo importante para você, crie seu primeiro hábito e volte para marcar cada dia cumprido."
                : `${completedToday} de ${active.length} hábitos cumpridos em ${habitDateLabel(today)}. Você pode começar ou recomeçar a qualquer momento.`}
            </p>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          {
            label: "Hábitos ativos",
            value: active.length,
            icon: <Sprout size={16} />,
            detail: "para cultivar",
          },
          {
            label: "Melhor sequência",
            value: `${best} ${best === 1 ? "dia" : "dias"}`,
            icon: <Flame size={16} />,
            detail: "recorde de um hábito",
          },
          {
            label: "Dias cultivados",
            value: total,
            icon: <Check size={16} />,
            detail: "marcações em todos os hábitos",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`erp-card min-w-0 p-3 sm:p-4 ${i === 1 ? "erp-card--peach" : i === 2 ? "erp-card--mint" : ""}`}
          >
            <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-mut sm:text-xs">
              {stat.label}
              <span className="hidden text-brand sm:block">{stat.icon}</span>
            </div>
            <b className="my-1 block break-words text-xl font-extrabold text-ink sm:text-2xl">
              {stat.value}
            </b>
            <p className="text-[10px] leading-relaxed text-mut">
              {stat.detail}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border border-line bg-white p-1 text-xs font-semibold">
          <button
            onClick={() => setArchived(false)}
            aria-pressed={!archived}
            className={`rounded-full px-3 py-1.5 ${!archived ? "bg-brand text-white" : "text-mut"}`}
          >
            Meu jardim <span className="ml-1 opacity-75">{active.length}</span>
          </button>
          <button
            onClick={() => setArchived(true)}
            aria-pressed={archived}
            className={`rounded-full px-3 py-1.5 ${archived ? "bg-brand text-white" : "text-mut"}`}
          >
            Arquivados{" "}
            <span className="ml-1 opacity-75">
              {habits.length - active.length}
            </span>
          </button>
        </div>
        <span className="text-[11px] text-mut">
          Cada botão marcado representa um dia cumprido.
        </span>
      </div>
      {message && (
        <p
          role="status"
          className="rounded-xl border border-line bg-white px-4 py-3 text-xs text-ink"
        >
          {message}
        </p>
      )}
      {!visible.length ? (
        <section className="erp-card px-5 py-10 text-center">
          <Sprout className="mx-auto mb-3 text-[#21805C]" size={38} />
          <h2 className="text-lg font-bold text-ink">
            {archived
              ? "Nenhum hábito arquivado"
              : "Plante seu primeiro hábito"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mut">
            {archived
              ? "Os hábitos arquivados ficam aqui com todo o seu histórico."
              : "Escolha algo simples e possível de repetir. Seu jardim vai crescer a cada marcação."}
          </p>
          {!archived && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["Ler 10 minutos", "Estudar um pouco", "Organizar meu dia"].map(
                (title) => (
                  <button
                    key={title}
                    onClick={() => setEditing({ habit: null, preset: title })}
                    className="rounded-full border border-line bg-soft px-3 py-2 text-xs font-semibold text-brand"
                  >
                    <Plus size={12} className="mr-1 inline" />
                    {title}
                  </button>
                ),
              )}
            </div>
          )}
        </section>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[1.3fr_1fr]">
          <section
            aria-label={archived ? "Hábitos arquivados" : "Hábitos ativos"}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"
          >
            {visible.map((habit) => {
              const s = stats.get(habit.id)!;
              const growth = habitGrowth(s.total);
              const isSelected = habit.id === chosen?.id;
              return (
                <article
                  key={habit.id}
                  aria-label={`Hábito ${habit.titulo}`}
                  className={`erp-card habits-card min-w-0 p-4 ${isSelected ? "ring-1 ring-brand/30" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${s.doneToday ? "habit-bloom" : ""}`}
                      style={{ background: habit.cor + "12" }}
                    >
                      <Plant total={s.total} color={habit.cor} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => viewCalendar(habit.id)}
                        aria-label={`Ver calendário de ${habit.titulo}`}
                        aria-pressed={isSelected}
                        className="block text-left"
                      >
                        <h3 className="break-words text-sm font-bold text-ink">
                          {habit.titulo}
                        </h3>
                      </button>
                      <p
                        className="mt-1 text-[10px] font-semibold"
                        style={{ color: habit.cor }}
                      >
                        {growth.name} · {s.total}{" "}
                        {s.total === 1 ? "registro" : "registros"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        aria-label={`Editar hábito ${habit.titulo}`}
                        onClick={() => setEditing({ habit })}
                        className="rounded-lg p-1.5 text-mut hover:bg-soft hover:text-brand"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        disabled={Boolean(archiving)}
                        aria-label={`${habit.arquivado ? "Restaurar" : "Arquivar"} hábito ${habit.titulo}`}
                        title={
                          habit.arquivado
                            ? "Restaurar hábito"
                            : "Arquivar sem apagar histórico"
                        }
                        onClick={() => archive(habit)}
                        className="rounded-lg p-1.5 text-mut hover:bg-soft hover:text-brand disabled:opacity-40"
                      >
                        {habit.arquivado ? (
                          <RotateCcw size={14} />
                        ) : (
                          <Archive size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                  {habit.descricao && (
                    <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-mut">
                      {habit.descricao}
                    </p>
                  )}
                  <div className="my-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mut">
                    <span>
                      <Flame size={12} className="mr-1 inline text-[#C45B26]" />
                      <b className="text-ink">{s.current}</b>{" "}
                      {s.current === 1 ? "dia" : "dias"} na sequência
                    </span>
                    <span>
                      Melhor: <b className="text-ink">{s.best}</b>{" "}
                      {s.best === 1 ? "dia" : "dias"}
                    </span>
                  </div>
                  {!habit.arquivado && (
                    <>
                      <div className="mb-3 grid grid-cols-7 gap-1">
                        {recent.map((day) => {
                          const done = s.marked.has(day);
                          const disabled =
                            day < habit.inicio ||
                            pending.includes(`${habit.id}:${day}`);
                          return (
                            <button
                              key={day}
                              disabled={disabled}
                              aria-pressed={done}
                              aria-label={`${done ? "Desmarcar" : "Marcar"} ${habitDateLabel(day)} para ${habit.titulo}`}
                              onClick={() => toggle(habit, day)}
                              className={`flex min-h-[42px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border text-[10px] transition-colors disabled:opacity-30 ${done ? "border-transparent text-white" : day === today ? "border-brand/40 bg-brand/5 text-brand" : "border-line bg-soft text-mut"}`}
                              style={
                                done ? { background: habit.cor } : undefined
                              }
                            >
                              <span className="capitalize">
                                {weekday(day).slice(0, 3)}
                              </span>
                              {done ? (
                                <Check size={12} />
                              ) : (
                                <span>{Number(day.slice(8))}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        disabled={pending.includes(`${habit.id}:${today}`)}
                        onClick={() => toggle(habit, agendaDate())}
                        aria-pressed={s.doneToday}
                        aria-label={`${s.doneToday ? "Desmarcar hoje" : "Marcar hoje"} para ${habit.titulo}`}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-colors disabled:opacity-50 ${s.doneToday ? "border-[#BBDCC9] bg-[#ECF8F0] text-[#19764F]" : "border-brand/20 bg-brand/[.05] text-brand hover:bg-brand/10"}`}
                      >
                        <Check size={15} />
                        {s.doneToday ? "Feito hoje" : "Marcar hoje"}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => viewCalendar(habit.id)}
                    className="mt-3 flex w-full items-center justify-between gap-2 text-[10px] text-mut"
                  >
                    <span>
                      {growth.next
                        ? `${Math.max(0, growth.next - s.total)} ${growth.next - s.total === 1 ? "registro" : "registros"} para a próxima fase`
                        : "Cada marcação fortalece suas raízes"}
                    </span>
                    <span className="shrink-0 font-semibold text-brand">
                      Calendário →
                    </span>
                  </button>
                </article>
              );
            })}
          </section>
          {chosen && selectedStats && (
            <section
              ref={calendarRef}
              aria-label={`Calendário de ${chosen.titulo}`}
              className="erp-card min-w-0 overflow-hidden xl:sticky xl:top-4"
            >
              <header className="border-b border-line bg-soft/60 p-4">
                <div className="flex items-center gap-2">
                  <Plant
                    total={selectedStats.total}
                    color={chosen.cor}
                    size={22}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-mut">
                      Seu mapa de constância
                    </p>
                    <h2 className="break-words text-sm font-bold text-ink">
                      {chosen.titulo}
                    </h2>
                  </div>
                </div>
                <select
                  aria-label="Hábito do calendário"
                  value={chosen.id}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink"
                >
                  {visible.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.titulo}
                    </option>
                  ))}
                </select>
              </header>
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    aria-label="Mês anterior dos hábitos"
                    onClick={() => setMonth(habitMonth(month, -1))}
                    className="rounded-lg border border-line p-1.5 text-mut hover:text-brand"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <h3 className="text-xs font-bold capitalize text-ink">
                    {monthLabel(month)}
                  </h3>
                  <button
                    aria-label="Próximo mês dos hábitos"
                    disabled={month >= today.slice(0, 7)}
                    onClick={() => setMonth(habitMonth(month, 1))}
                    className="rounded-lg border border-line p-1.5 text-mut hover:text-brand disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold text-mut">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                    (d) => (
                      <span key={d}>{d}</span>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: calendar.first }, (_, i) => (
                    <span key={`empty${i}`} />
                  ))}
                  {calendar.days.map((day) => {
                    const done = selectedStats.marked.has(day);
                    const unavailable =
                      day > today || day < chosen.inicio || chosen.arquivado;
                    return (
                      <button
                        key={day}
                        disabled={
                          unavailable || pending.includes(`${chosen.id}:${day}`)
                        }
                        aria-pressed={done}
                        aria-label={`${habitDateLabel(day)}: ${done ? "cumprido" : "não marcado"} para ${chosen.titulo}`}
                        onClick={() => toggle(chosen, day)}
                        className={`relative flex h-9 min-w-0 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${done ? "border-transparent text-white" : day === today ? "border-brand/50 bg-brand/[.06] text-brand" : "border-transparent bg-soft text-ink"} ${unavailable && !done ? "opacity-25" : "hover:border-brand/40"}`}
                        style={done ? { background: chosen.cor } : undefined}
                      >
                        <span>{Number(day.slice(8))}</span>
                        {done && (
                          <Check
                            size={9}
                            className="absolute bottom-0.5 right-0.5"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-mut">
                  <span>
                    <i
                      className="mr-1 inline-block size-2 rounded"
                      style={{ background: chosen.cor }}
                    />
                    Cumprido
                  </span>
                  <span>
                    <i className="mr-1 inline-block size-2 rounded bg-soft" />
                    Não marcado
                  </span>
                  <span>
                    <i className="mr-1 inline-block size-2 rounded border border-brand" />
                    Hoje
                  </span>
                </div>
                <div className="mt-4 rounded-xl bg-soft p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-mut">Constância neste mês</span>
                    <b style={{ color: chosen.cor }}>
                      {selectedStats.percent}%
                    </b>
                  </div>
                  <div className="my-2 h-2 overflow-hidden rounded-full bg-black/[.05]">
                    <div
                      className="habits-meter h-full rounded-full"
                      style={{
                        width: `${selectedStats.percent}%`,
                        background: chosen.cor,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-mut">
                    {selectedStats.monthDone} de {selectedStats.monthPossible}{" "}
                    dias possíveis até hoje · início em{" "}
                    {habitDateLabel(chosen.inicio)}
                  </p>
                </div>
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-ink">
                    <Trophy size={13} className="text-[#AB8230]" />
                    Pequenas conquistas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: "Primeiro passo",
                        done: selectedStats.total >= 1,
                      },
                      {
                        label: "7 dias seguidos",
                        done: selectedStats.best >= 7,
                      },
                      {
                        label: "21 registros",
                        done: selectedStats.total >= 21,
                      },
                    ].map((b) => (
                      <span
                        key={b.label}
                        className={`rounded-full border px-2 py-1 text-[10px] ${b.done ? "border-[#E8D7A8] bg-[#FFF7DF] text-[#89651B]" : "border-line bg-white text-mut/60"}`}
                      >
                        {b.done ? "✦" : "○"} {b.label}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-mut">
                  {chosen.arquivado
                    ? "Histórico preservado. Restaure o hábito para voltar a marcar dias."
                    : "Toque em um dia para marcar ou desfazer. Dias futuros e anteriores ao início ficam bloqueados. Se hoje ainda não foi marcado, a sequência considera até ontem."}
                </p>
              </div>
            </section>
          )}
        </div>
      )}
      {editing && (
        <HabitEditor
          editor={editing}
          today={today}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            setSelected(id);
            setArchived(Boolean(editing.habit?.arquivado));
            setMessage(
              "Hábito salvo. Seu próximo passo já tem lugar no jardim.",
            );
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function HabitEditor({
  editor,
  today,
  onClose,
  onSaved,
}: {
  editor: Edit;
  today: string;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [id] = useState(() => editor.habit?.id ?? crypto.randomUUID());
  const [color, setColor] = useState(editor.habit?.cor ?? "#21805C");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  function close() {
    if (!busy && (!dirty || confirm("Descartar alterações não salvas?")))
      onClose();
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const result = await saveHabit({
        id,
        titulo: String(form.get("titulo") ?? ""),
        descricao: String(form.get("descricao") ?? ""),
        cor: color,
        inicio: String(form.get("inicio") ?? ""),
      });
      if (result.error) setError(result.error);
      else onSaved(id);
    } catch {
      setError(
        "Falha de conexão. Seus dados continuam aqui para tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90dvh] max-w-[440px] overflow-y-auto rounded-2xl border-line p-5">
        <DialogTitle className="text-lg font-bold text-ink">
          {editor.habit ? "Editar hábito" : "Plantar um novo hábito"}
        </DialogTitle>
        <DialogDescription className="text-xs leading-relaxed text-mut">
          Escolha uma ação simples que deseja repetir diariamente. Você pode
          marcar o dia quando cumprir.
        </DialogDescription>
        <form
          onSubmit={submit}
          onChange={() => setDirty(true)}
          className="space-y-3"
        >
          <label className="block text-xs font-semibold text-ink">
            Nome do hábito
            <input
              aria-label="Nome do hábito"
              name="titulo"
              required
              maxLength={120}
              defaultValue={editor.habit?.titulo ?? editor.preset ?? ""}
              placeholder="Ex.: ler 10 minutos"
              className={field}
            />
          </label>
          <label className="block text-xs font-semibold text-ink">
            Seu motivo ou detalhe (opcional)
            <textarea
              aria-label="Descrição do hábito"
              name="descricao"
              rows={2}
              maxLength={500}
              defaultValue={editor.habit?.descricao ?? ""}
              placeholder="Um pequeno lembrete do porquê isso importa para você…"
              className={field}
            />
          </label>
          <label className="block text-xs font-semibold text-ink">
            Começar em
            <input
              aria-label="Data de início do hábito"
              name="inicio"
              type="date"
              required
              max={today}
              defaultValue={editor.habit?.inicio ?? today}
              className={field}
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-ink">
              Cor da sua planta
            </legend>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={`Cor ${c.label}`}
                  aria-pressed={color === c.value}
                  onClick={() => {
                    setColor(c.value);
                    setDirty(true);
                  }}
                  className={`flex size-9 items-center justify-center rounded-full border-2 ${color === c.value ? "border-ink ring-2 ring-white ring-offset-1" : "border-transparent"}`}
                  style={{ background: c.value }}
                >
                  {color === c.value && (
                    <Check size={17} className="text-white" />
                  )}
                </button>
              ))}
            </div>
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-danger/5 p-2 text-xs text-danger"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? "Salvando…" : "Salvar hábito"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
