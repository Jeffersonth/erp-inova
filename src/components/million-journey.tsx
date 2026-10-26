"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Plus,
  Pencil,
  Trash2,
  Trophy,
  TrendingUp,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  saveJourneyGain,
  deleteJourneyGain,
  saveJourneyGoal,
  deleteJourneyGoal,
} from "@/lib/actions/million";
import {
  MILLION,
  MONTHLY_DEFAULT,
  journeyMoney,
  journeySummary,
  monthEnd,
  type JourneyGain,
  type JourneyGoal,
} from "@/lib/million";

type GoalView = ReturnType<typeof journeySummary>["all"][number];
type Editor =
  | { kind: "gain"; gain: JourneyGain | null }
  | { kind: "goal"; goal: JourneyGoal | null }
  | { kind: "complete"; goal: JourneyGoal };
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
const monthLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 7)}-01T12:00:00Z`));
const input =
  "mt-1 w-full min-w-0 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-brand";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-brand/40 disabled:opacity-50";
function Money({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      previous.current = value;
      return;
    }
    const from = previous.current;
    const start = performance.now();
    let frame = 0;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / 900);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    previous.current = value;
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span aria-label={journeyMoney(value)}>
      <span aria-hidden="true">{journeyMoney(shown)}</span>
    </span>
  );
}
function Meter({
  value,
  label,
  dark = false,
}: {
  value: number;
  label: string;
  dark?: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value * 10) / 10}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2.5 overflow-hidden rounded-full ${dark ? "bg-white/15" : "bg-black/[.06]"}`}
    >
      <div
        className="journey-meter h-full rounded-full bg-gradient-to-r from-[#EF2B91] to-[#FF7939]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function MillionJourney({
  gains,
  goals,
  today,
}: {
  gains: JourneyGain[];
  goals: JourneyGoal[];
  today: string;
}) {
  const router = useRouter();
  const summary = useMemo(
    () => journeySummary(gains, goals, today),
    [gains, goals, today],
  );
  const [tab, setTab] = useState<"active" | "achieved" | "expired">("active");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const known = useRef(new Set(summary.achieved.map((g) => g.id)));
  useEffect(() => {
    const next = new Set(summary.achieved.map((g) => g.id));
    const fresh = Array.from(next).some((id) => !known.current.has(id));
    known.current = next;
    if (fresh) {
      setCelebrate(true);
    }
  }, [summary]);
  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(false), 2400);
    return () => clearTimeout(timer);
  }, [celebrate]);
  const visibleGoals = summary[tab];
  const filtered = gains.filter(
    (g) =>
      (!month || g.data.startsWith(month)) &&
      (!search ||
        `${g.titulo} ${g.origem} ${g.notas}`
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR"))),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages - 1);
  const entries = filtered.slice(currentPage * 8, currentPage * 8 + 8);
  const maxChart = Math.max(1, ...summary.series.map((s) => s.value));
  const monthOptions = Array.from(new Set(gains.map((g) => g.data.slice(0, 7))))
    .sort()
    .reverse();
  async function remove(kind: "gain" | "goal", id: string) {
    if (
      busy ||
      !confirm(
        kind === "gain"
          ? "Excluir este ganho? O progresso será recalculado."
          : "Excluir este objetivo? Os ganhos serão preservados.",
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const result =
        kind === "gain"
          ? await deleteJourneyGain(id)
          : await deleteJourneyGoal(id);
      setMessage(result.error ?? "Registro excluído.");
      if (!result.error) router.refresh();
    } catch {
      setMessage(
        "Falha de conexão. Atualize a página antes de tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5 journey-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-brand">
            <Sparkles size={12} />
            Sua próxima grande conquista
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Do zero ao milhão
          </h1>
          <p className="mt-1 text-[13px] text-mut">
            Cada ganho é um passo. Cada objetivo alcançado conta a sua história.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditor({ kind: "goal", goal: null })}
            className={secondary}
          >
            <Flag size={14} />
            Novo objetivo
          </button>
          <button
            onClick={() => setEditor({ kind: "gain", gain: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white"
          >
            <Plus size={16} />
            Registrar ganho
          </button>
        </div>
      </header>
      {message && (
        <p
          role="status"
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink"
        >
          {message}
        </p>
      )}
      {celebrate && (
        <div
          role="status"
          className="journey-celebration flex items-center gap-3 rounded-2xl border border-[#EFC679] bg-[#FFF7DF] p-4 text-[#805817]"
        >
          <Trophy size={24} />
          <div>
            <b className="block text-sm">Mais uma conquista na sua história!</b>
            <span className="text-xs">
              Seu objetivo está na coleção de conquistas.
            </span>
          </div>
          <Sparkles className="ml-auto shrink-0" />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section
          aria-label="Progresso até um milhão"
          className="journey-hero relative isolate overflow-hidden rounded-[22px] bg-[#170C28] p-5 text-white sm:p-7"
        >
          <div
            aria-hidden="true"
            className="journey-orb absolute -right-16 -top-20 -z-10 size-72 rounded-full bg-gradient-to-br from-[#EF2B91]/35 to-[#FF7939]/25 blur-3xl"
          />
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.15em] text-[#E4D8ED]">
              A jornada do seu primeiro milhão
            </span>
            <Trophy size={22} className="shrink-0 text-[#FFB778]" />
          </div>
          <p className="text-xs text-[#C7B9D7]">Total de ganhos registrados</p>
          <div className="my-2 break-words text-[clamp(1.8rem,4.6vw,3.5rem)] font-extrabold leading-tight tracking-tight tabular-nums">
            <Money value={summary.total} />
          </div>
          <p className="mb-5 text-xs text-[#C7B9D7]">
            de {journeyMoney(MILLION)} ·{" "}
            {summary.percent.toLocaleString("pt-BR", {
              maximumFractionDigits: 2,
            })}
            % da jornada
          </p>
          <Meter
            value={summary.percent}
            label="Progresso do primeiro milhão"
            dark
          />
          <div className="mt-3 flex justify-between gap-2 text-[11px] text-[#D1C5DD]">
            <span>R$ 0</span>
            <span className="text-right">
              {summary.total >= MILLION
                ? "Seu primeiro milhão foi alcançado ✨"
                : `Faltam ${journeyMoney(Math.max(0, MILLION - summary.total))}`}
            </span>
          </div>
        </section>
        <section
          aria-label="Meta do mês"
          className="erp-card erp-card--peach flex min-w-0 flex-col p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-bold text-ink">
              <Flag size={17} className="text-brand" />
              Meta do mês
            </span>
            <button
              aria-label="Editar meta do mês"
              onClick={() => setEditor({ kind: "goal", goal: summary.monthly })}
              className="rounded-lg border border-line bg-white/70 p-2 text-mut hover:text-brand"
            >
              <Pencil size={14} />
            </button>
          </div>
          <p className="mt-1 text-xs capitalize text-mut">
            {monthLabel(today)}
          </p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-2">
            <b className="break-words text-3xl font-extrabold tracking-tight text-ink">
              <Money value={summary.monthly.current} />
            </b>
            <span className="text-xs text-mut">
              / {journeyMoney(Number(summary.monthly.alvo_centavos))}
            </span>
          </div>
          <div className="mb-2 mt-auto pt-5">
            <Meter
              value={summary.monthly.percent}
              label="Ganhos da meta mensal"
            />
          </div>
          <p className="text-xs text-mut">
            {summary.monthly.completed ? (
              <span className="font-bold text-[#19764F]">
                ✓{" "}
                {summary.monthly.manual
                  ? "Meta marcada como conquistada"
                  : "Meta conquistada"}{" "}
                · {dateLabel(summary.monthly.completed)}
              </span>
            ) : (
              <>
                {summary.monthly.percent.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}
                % · faltam{" "}
                <b className="text-ink">
                  {journeyMoney(
                    Math.max(
                      0,
                      Number(summary.monthly.alvo_centavos) -
                        summary.monthly.current,
                    ),
                  )}
                </b>
              </>
            )}
          </p>
          <p className="mt-3 text-[10px] text-mut">
            Ganhos de {dateLabel(today.slice(0, 7) + "-01")} a{" "}
            {dateLabel(monthEnd(today))}.
          </p>
        </section>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Próximo marco",
            value: summary.next
              ? journeyMoney(Number(summary.next.alvo_centavos))
              : "Todos conquistados",
            detail: summary.next?.titulo ?? "Continue escrevendo sua história",
            icon: <Flag size={17} />,
          },
          {
            label: "Conquistas",
            value: String(summary.achieved.length),
            detail: "Objetivos alcançados na sua jornada",
            icon: <Trophy size={17} />,
          },
          {
            label: "Ganhos registrados",
            value: String(gains.length),
            detail: "Lançamentos que constroem o seu progresso",
            icon: <Wallet size={17} />,
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`erp-card min-w-0 p-4 ${i === 1 ? "erp-card--lavender" : ""}`}
          >
            <div className="flex items-center justify-between text-xs text-mut">
              {stat.label}
              <span className="text-brand">{stat.icon}</span>
            </div>
            <b className="mt-2 block break-words text-xl font-extrabold text-ink">
              {stat.value}
            </b>
            <p className="mt-1 text-[11px] text-mut">{stat.detail}</p>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-ink">Seus objetivos</h2>
            <span className="text-[11px] text-mut">
              Evolução que vira conquista
            </span>
          </div>
          <div
            className="mb-4 flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Status dos objetivos"
          >
            {(
              [
                { key: "active", label: "Em andamento" },
                { key: "achieved", label: "Conquistados" },
                { key: "expired", label: "Meses encerrados" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                role="tab"
                id={`journey-tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls={`journey-panel-${t.key}`}
                tabIndex={tab === t.key ? 0 : -1}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const keys = ["active", "achieved", "expired"] as const;
                  const index = keys.indexOf(t.key);
                  const next = keys[event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3];
                  setTab(next);
                  document.getElementById(`journey-tab-${next}`)?.focus();
                }}
                onClick={() => setTab(t.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tab === t.key ? "border-brand bg-brand text-white" : "border-line bg-white text-mut hover:text-brand"}`}
              >
                {t.label}{" "}
                <span className="ml-1 opacity-75">{summary[t.key].length}</span>
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`journey-panel-${tab}`}
            aria-labelledby={`journey-tab-${tab}`}
            className="grid gap-3 sm:grid-cols-2"
          >
            {!visibleGoals.length && (
              <div className="erp-card col-span-full px-5 py-10 text-center">
                <Trophy className="mx-auto mb-2 text-brand/60" />
                <p className="text-sm font-semibold text-ink">
                  {tab === "achieved"
                    ? "Suas próximas conquistas aparecerão aqui"
                    : tab === "expired"
                      ? "Nenhum mês encerrado com meta pendente"
                      : "Nenhum objetivo pendente"}
                </p>
                <p className="mt-1 text-xs text-mut">
                  {tab === "achieved"
                    ? "Registre seus ganhos ou marque um objetivo alcançado."
                    : "Você pode criar novos objetivos quando quiser."}
                </p>
              </div>
            )}
            {visibleGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                busy={busy}
                onEdit={() => setEditor({ kind: "goal", goal })}
                onComplete={() => setEditor({ kind: "complete", goal })}
                onDelete={() => remove("goal", goal.id)}
              />
            ))}
          </div>
        </section>
        <section
          aria-label="Ganhos nos últimos seis meses"
          className="erp-card min-w-0 p-5"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={17} className="text-brand" />
            <h2 className="text-sm font-bold text-ink">
              Seu ritmo de crescimento
            </h2>
          </div>
          <p className="mt-1 text-xs text-mut">
            Ganhos por mês · últimos 6 meses
          </p>
          <div className="mt-5 flex h-48 items-end gap-2">
            {summary.series.map((s) => (
              <div
                key={s.month}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="relative w-full max-w-[42px] flex-1 rounded-lg bg-soft">
                  <div
                    className={`journey-column absolute bottom-0 w-full rounded-lg ${s.month === today.slice(0, 7) ? "bg-gradient-to-t from-brand to-[#FF7939]" : "bg-[#C51E72]/35"}`}
                    style={{ height: `${(s.value / maxChart) * 100}%` }}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`${monthLabel(s.month)}: ${journeyMoney(s.value)}. Filtrar lançamentos.`}
                  title={journeyMoney(s.value)}
                  onClick={() => {
                    setMonth(s.month);
                    setPage(0);
                    document
                      .getElementById("journey-ledger")
                      ?.scrollIntoView({
                        behavior: matchMedia("(prefers-reduced-motion: reduce)")
                          .matches
                          ? "auto"
                          : "smooth",
                        block: "start",
                      });
                  }}
                  className="rounded px-1 py-1 text-[11px] capitalize text-mut hover:bg-soft hover:text-brand"
                >
                  {s.label}
                </button>
              </div>
            ))}
          </div>
          {gains.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line px-3 py-4 text-xs leading-relaxed text-mut">
              Registre o primeiro ganho para dar vida ao seu gráfico. A jornada
              começa com o primeiro passo.
            </p>
          ) : (
            <p className="mt-4 text-[11px] text-mut">
              Toque no mês para ver os lançamentos correspondentes.
            </p>
          )}
          <div className="mt-5 rounded-xl bg-soft p-3 text-xs leading-relaxed text-mut">
            <b className="block text-ink">Como o progresso funciona</b>Os ganhos
            registrados aqui somam na jornada e no mês da data informada. Os
            marcos são reconhecidos automaticamente. A meta padrão é R$ 10 mil
            por mês, editável mês a mês.
          </div>
        </section>
      </div>
      <section
        id="journey-ledger"
        className="erp-card scroll-mt-20 overflow-hidden"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div>
            <h2 className="text-base font-bold text-ink">
              Histórico de ganhos
            </h2>
            <p className="mt-1 text-xs text-mut">
              Registre o que você ganhou e acompanhe cada avanço.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <input
              aria-label="Buscar ganhos"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar ganho ou origem…"
              className="min-w-0 flex-1 rounded-lg border border-line bg-soft px-3 py-2 text-xs"
            />
            <select
              aria-label="Filtrar mês dos ganhos"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(0);
              }}
              className="max-w-full rounded-lg border border-line bg-white px-2 py-2 text-xs"
            >
              <option value="">Todos os meses</option>
              {Array.from(new Set([...(month ? [month] : []), ...monthOptions]))
                .sort()
                .reverse()
                .map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
            </select>
          </div>
        </header>
        {!entries.length ? (
          <div className="px-5 py-10 text-center">
            <Wallet className="mx-auto mb-2 text-brand/60" />
            <p className="text-sm font-semibold text-ink">
              {gains.length
                ? "Nenhum ganho neste filtro"
                : "Seu primeiro ganho está por vir"}
            </p>
            <p className="mt-1 text-xs text-mut">
              {gains.length
                ? "Ajuste o mês ou a busca para ver outros lançamentos."
                : "Use Registrar ganho para começar a construir sua jornada."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#E9F7EE] text-[#21805C]">
                  <ArrowUpRight size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block break-words text-sm text-ink">
                    {g.titulo}
                  </b>
                  <span className="text-[11px] text-mut">
                    {dateLabel(g.data)}
                    {g.origem ? ` · ${g.origem}` : ""}
                  </span>
                  {g.notas && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-mut">
                      {g.notas}
                    </p>
                  )}
                </div>
                <b className="text-sm font-extrabold tabular-nums text-[#19764F]">
                  + {journeyMoney(Number(g.valor_centavos))}
                </b>
                <div className="flex gap-1">
                  <button
                    disabled={busy}
                    aria-label={`Editar ganho ${g.titulo}`}
                    onClick={() => setEditor({ kind: "gain", gain: g })}
                    className="rounded-lg p-2 text-mut hover:bg-soft hover:text-brand"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    disabled={busy}
                    aria-label={`Excluir ganho ${g.titulo}`}
                    onClick={() => remove("gain", g.id)}
                    className="rounded-lg p-2 text-mut hover:bg-soft hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[11px] text-mut">
          <span>
            {filtered.length} lançamentos ·{" "}
            {journeyMoney(
              filtered.reduce((sum, g) => sum + Number(g.valor_centavos), 0),
            )}{" "}
            no filtro
          </span>
          <div className="flex items-center gap-2">
            <button
              aria-label="Página anterior de ganhos"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
              className="rounded p-1 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            {currentPage + 1} / {pages}
            <button
              aria-label="Próxima página de ganhos"
              disabled={currentPage + 1 === pages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded p-1 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>
      {editor && (
        <JourneyEditor
          editor={editor}
          today={today}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setMessage("Alterações salvas. Seu progresso foi atualizado.");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
function GoalCard({
  goal,
  busy,
  onEdit,
  onComplete,
  onDelete,
}: {
  goal: GoalView;
  busy: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const achieved = Boolean(goal.completed);
  return (
    <article
      className={`erp-card journey-goal min-w-0 p-4 ${achieved ? "journey-goal--done" : ""}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${achieved ? "bg-[#FFF0C8] text-[#987016]" : "bg-brand/10 text-brand"}`}
        >
          {achieved ? <Trophy size={18} /> : <Flag size={18} />}
        </span>
        <div className="flex gap-1">
          <button
            aria-label={`Editar objetivo ${goal.titulo}`}
            onClick={onEdit}
            className="rounded-md p-1.5 text-mut hover:bg-white/70 hover:text-brand"
          >
            <Pencil size={13} />
          </button>
          {goal.tipo === "marco" && (
            <button
              aria-label={`Excluir objetivo ${goal.titulo}`}
              disabled={busy}
              onClick={onDelete}
              className="rounded-md p-1.5 text-mut hover:bg-white/70 hover:text-danger"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-mut">
        {goal.tipo === "mensal" ? monthLabel(goal.mes!) : "Marco da jornada"}
      </p>
      <h3 className="break-words text-sm font-bold text-ink">{goal.titulo}</h3>
      <p className="mt-1 break-words text-xl font-extrabold tracking-tight text-ink">
        {journeyMoney(Number(goal.alvo_centavos))}
      </p>
      <div className="my-3">
        <Meter value={goal.percent} label={`Progresso de ${goal.titulo}`} />
      </div>
      <p className="text-[11px] text-mut">
        {journeyMoney(goal.current)} registrados ·{" "}
        {goal.percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
      </p>
      {achieved ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-white/65 p-2 text-[11px] font-semibold text-[#19764F]">
          <Check size={13} className="mt-px shrink-0" />
          {goal.manual
            ? "Marcado como alcançado"
            : "Alcançado pelos ganhos"} · {dateLabel(goal.completed!)}
        </p>
      ) : goal.expired ? (
        <p className="mt-3 text-[11px] text-mut">
          Mês encerrado · {dateLabel(monthEnd(goal.mes!))}
        </p>
      ) : (
        <>
          <p className="mt-2 text-[11px] text-mut">
            {goal.prazo
              ? `Prazo: ${dateLabel(goal.prazo)}`
              : goal.tipo === "mensal"
                ? `Até ${dateLabel(monthEnd(goal.mes!))}`
                : "No seu ritmo, um ganho por vez."}
          </p>
          <button
            onClick={onComplete}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand/[.04] px-2.5 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand/10"
          >
            <Check size={13} />
            Marcar como alcançado
          </button>
        </>
      )}
    </article>
  );
}

function JourneyEditor({
  editor,
  today,
  onClose,
  onSaved,
}: {
  editor: Editor;
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [type, setType] = useState(
    editor.kind !== "gain" ? (editor.goal?.tipo ?? "marco") : "marco",
  );
  const gain = editor.kind === "gain" ? editor.gain : null;
  const goal = editor.kind !== "gain" ? editor.goal : null;
  const [gainId] = useState(() => gain?.id ?? crypto.randomUUID());
  const title =
    editor.kind === "gain"
      ? gain
        ? "Editar ganho"
        : "Registrar ganho"
      : editor.kind === "complete"
        ? "Registrar conquista"
        : goal
          ? "Editar objetivo"
          : "Novo objetivo";
  function close() {
    if (!busy && (!dirty || confirm("Descartar alterações não salvas?")))
      onClose();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    setBusy(true);
    setError("");
    try {
      const result =
        editor.kind === "gain"
          ? await saveJourneyGain({
              id: gainId,
              titulo: text("titulo"),
              valor: text("valor"),
              data: text("data"),
              origem: text("origem"),
              notas: text("notas"),
            })
          : await saveJourneyGoal({
              id: goal && !goal.id.startsWith("monthly:") ? goal.id : null,
              titulo:
                editor.kind === "complete" ? goal!.titulo : text("titulo"),
              valor:
                editor.kind === "complete"
                  ? (Number(goal!.alvo_centavos) / 100).toFixed(2)
                  : text("valor"),
              tipo: editor.kind === "complete" ? goal!.tipo : type,
              mes:
                (editor.kind === "complete" ? goal!.tipo : type) === "mensal"
                  ? editor.kind === "complete"
                    ? goal!.mes
                    : text("mes") + "-01"
                  : null,
              prazo:
                editor.kind === "complete"
                  ? goal!.prazo
                  : text("prazo") || null,
              concluido_em: text("concluido_em") || null,
            });
      if (result.error) setError(result.error);
      else onSaved();
    } catch {
      setError("Falha de conexão. Seus dados continuam no formulário.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90dvh] max-w-[460px] overflow-y-auto rounded-2xl border-line p-5">
        <DialogTitle className="text-lg font-bold text-ink">
          {title}
        </DialogTitle>
        <DialogDescription className="text-xs leading-relaxed text-mut">
          {editor.kind === "gain"
            ? "Informe um ganho efetivamente recebido. Ele contará na jornada e no mês da data escolhida."
            : editor.kind === "complete"
              ? "A marcação manual guarda a conquista sem adicionar ganhos ao total."
              : "Escolha um marco acumulado ou uma meta específica de um mês."}
        </DialogDescription>
        <form
          onSubmit={submit}
          onChange={() => setDirty(true)}
          className="space-y-3"
        >
          {editor.kind === "complete" ? (
            <div className="rounded-xl bg-soft p-3">
              <b className="text-sm text-ink">{goal!.titulo}</b>
              <p className="text-xs text-mut">
                Objetivo de {journeyMoney(Number(goal!.alvo_centavos))}
              </p>
            </div>
          ) : (
            <>
              <label className="block text-xs font-semibold text-ink">
                Título
                <input
                  aria-label="Título"
                  name="titulo"
                  required
                  maxLength={editor.kind === "gain" ? 160 : 120}
                  defaultValue={gain?.titulo ?? goal?.titulo ?? ""}
                  placeholder={
                    editor.kind === "gain"
                      ? "Ex.: pagamento de um projeto"
                      : "Ex.: meus primeiros R$ 20 mil"
                  }
                  className={input}
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Valor (R$)
                <input
                  aria-label="Valor em reais"
                  name="valor"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  max="9999999999.99"
                  required
                  defaultValue={
                    gain
                      ? (Number(gain.valor_centavos) / 100).toFixed(2)
                      : goal
                        ? (Number(goal.alvo_centavos) / 100).toFixed(2)
                        : type === "mensal"
                          ? String(MONTHLY_DEFAULT / 100)
                          : ""
                  }
                  placeholder="10000.00"
                  className={input}
                />
              </label>
            </>
          )}
          {editor.kind === "gain" ? (
            <>
              <label className="block text-xs font-semibold text-ink">
                Data do ganho
                <input
                  aria-label="Data do ganho"
                  name="data"
                  type="date"
                  required
                  max={today}
                  defaultValue={gain?.data ?? today}
                  className={input}
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Origem (opcional)
                <input
                  aria-label="Origem do ganho"
                  name="origem"
                  maxLength={80}
                  defaultValue={gain?.origem ?? ""}
                  placeholder="Ex.: sites, aplicativos, trabalho…"
                  className={input}
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Anotações (opcional)
                <textarea
                  aria-label="Anotações do ganho"
                  name="notas"
                  rows={2}
                  maxLength={2000}
                  defaultValue={gain?.notas ?? ""}
                  className={input}
                />
              </label>
            </>
          ) : (
            <>
              {editor.kind !== "complete" && (
                <>
                  <label className="block text-xs font-semibold text-ink">
                    Tipo de objetivo
                    <select
                      aria-label="Tipo de objetivo"
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value as "marco" | "mensal")
                      }
                      className={input}
                    >
                      <option value="marco">Marco · total acumulado</option>
                      <option value="mensal">Meta de um mês</option>
                    </select>
                  </label>
                  {type === "mensal" ? (
                    <label className="block text-xs font-semibold text-ink">
                      Mês
                      <input
                        aria-label="Mês do objetivo"
                        name="mes"
                        type="month"
                        required
                        defaultValue={
                          goal?.mes?.slice(0, 7) ?? today.slice(0, 7)
                        }
                        className={input}
                      />
                    </label>
                  ) : (
                    <label className="block text-xs font-semibold text-ink">
                      Prazo (opcional)
                      <input
                        aria-label="Prazo do objetivo"
                        name="prazo"
                        type="date"
                        defaultValue={goal?.prazo ?? ""}
                        className={input}
                      />
                    </label>
                  )}
                </>
              )}
              <label className="block text-xs font-semibold text-ink">
                {editor.kind === "complete"
                  ? "Data da conquista"
                  : "Conclusão manual (opcional)"}
                <input
                  aria-label="Data da conquista"
                  name="concluido_em"
                  type="date"
                  required={editor.kind === "complete"}
                  max={today}
                  defaultValue={
                    goal?.concluido_em ??
                    (editor.kind === "complete" ? today : "")
                  }
                  className={input}
                />
              </label>
              {editor.kind !== "complete" && (
                <p className="text-[11px] text-mut">
                  Deixe vazio para reconhecer pelos ganhos. Limpe a data para
                  desfazer uma marcação manual.
                </p>
              )}
            </>
          )}
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
              className={secondary}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy
                ? "Salvando…"
                : editor.kind === "complete"
                  ? "Guardar conquista"
                  : "Salvar"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
