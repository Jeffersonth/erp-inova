import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  FolderHeart,
  NotebookPen,
  Sparkles,
  Timer,
  Utensils,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  agendaDate,
  agendaNoPeriodo,
  montarAgenda,
  AGENDA_TIPOS,
  agendaMoney,
  type AgendaEvent,
  type AgendaRecebimento,
} from "@/lib/agenda-items";
import {
  conversaAtiva,
  focoSemana,
  percentual,
  resumoPessoais,
  resumoTarefas,
  type DashboardTask,
} from "@/lib/dashboard";
import {
  CONVERSA_STATUS,
  canalLabel,
  type ConversaLead,
} from "@/lib/prospeccao";
import type { PersonalProject } from "@/lib/personal-projects";
import type { RotinaItem } from "@/lib/rotina";
import { rotinaHorarioOrdem } from "@/lib/rotina";
import type { CanalStats } from "@/lib/leads";
import { formatDuracao } from "@/lib/format";

function Panel({
  title,
  href,
  icon,
  children,
  tint = "",
}: {
  title: string;
  href: string;
  icon: ReactNode;
  children: ReactNode;
  tint?: string;
}) {
  return (
    <section className={`erp-card dashboard-panel min-w-0 p-4 ${tint}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-brand" aria-hidden="true">
          {icon}
        </span>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <Link
          href={href}
          aria-label={`Abrir ${title}`}
          className="ml-auto rounded-lg border border-line bg-white/70 p-1.5 text-brand hover:bg-white"
        >
          <ArrowUpRight size={15} />
        </Link>
      </div>
      {children}
    </section>
  );
}
function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mt-2 h-2 overflow-hidden rounded-full bg-black/[.07]"
    >
      <div
        className="dashboard-bar h-full rounded-full bg-gradient-to-r from-brand to-[#FF7939]"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="py-3 text-[13px] text-mut">{children}</p>;
}
function Unavailable() {
  return (
    <p role="alert" className="text-[13px] text-danger">
      Não foi possível carregar esta área. Atualize a página para tentar
      novamente.
    </p>
  );
}
export function ZoneHeading({
  id,
  title,
  subtitle,
  number,
}: {
  id: string;
  title: string;
  subtitle: string;
  number: string;
}) {
  return (
    <div className="dashboard-zone-heading flex items-center gap-3 rounded-xl px-4 py-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/20 bg-white/60 text-sm font-extrabold"
        aria-hidden="true"
      >
        {number}
      </span>
      <div>
        <h2 id={id} className="text-xl font-extrabold tracking-tight">
          {title}
        </h2>
        <p className="mt-0.5 text-xs opacity-80">{subtitle}</p>
      </div>
    </div>
  );
}
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(`${date}T12:00:00Z`),
  );

export async function DashboardOverview({
  today,
  conversas,
  conversasErro,
  canais,
  clientesTotal,
}: {
  today: string;
  conversas: ConversaLead[];
  conversasErro: boolean;
  canais: CanalStats[] | null;
  clientesTotal: number | null;
}) {
  const db = createClient();
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const endIso = end.toISOString().slice(0, 10);
  const week = new Date(`${today}T12:00:00Z`);
  week.setUTCDate(week.getUTCDate() - 6);
  const [
    tasks,
    personal,
    events,
    receivables,
    notes,
    categories,
    rules,
    routine,
    focus,
    work,
  ] = await Promise.all([
    db
      .from<DashboardTask>("tarefas_dia")
      .select("id,titulo,status,data_finalizar")
      .order("ordem"),
    db
      .from<PersonalProject>("projetos_pessoais")
      .select("id,titulo,categoria,prazo,etapas,notas"),
    db
      .from<AgendaEvent>("eventos_agenda")
      .select(
        "id,titulo,tipo_ev,quando,fim,dia_inteiro,local,notas,projeto_id,valor,moeda,pago",
      )
      .lt("quando", `${endIso}T23:59:59.999-03:00`),
    db
      .from<AgendaRecebimento>("recebimentos")
      .select(
        "id,descricao,valor,valor_pago,moeda,status,vencimento,clientes(nome)",
      )
      .not("vencimento", "is", null),
    db
      .from<{ id: string; concluida: boolean; due: string | null }>("anotacoes")
      .select("id,concluida,due"),
    db.from<{ id: string }>("regras_categorias").select("id"),
    db
      .from<{ id: string; categoria_id: string }>("regras")
      .select("id,categoria_id"),
    db
      .from<RotinaItem>("rotina_itens")
      .select("id,tipo,titulo,horario,dias,descricao,ordem"),
    db
      .from<{ finalizada_em: string; duracao_seg: number }>("sessoes_foco")
      .select("finalizada_em,duracao_seg")
      .eq("tipo", "foco")
      .gte("finalizada_em", `${week.toISOString().slice(0, 10)}T00:00:00-03:00`)
      .lt("finalizada_em", `${today}T23:59:59.999-03:00`),
    db
      .from<{
        id: string;
        titulo: string;
        status: string;
        progresso: number;
        data_entrega: string | null;
      }>("projetos")
      .select("id,titulo,status,progresso,data_entrega"),
  ]);
  const t = resumoTarefas(tasks.data ?? [], today);
  const p = resumoPessoais(personal.data ?? [], today);
  const agendaError = Boolean(events.error || receivables.error || tasks.error);
  const agenda = agendaNoPeriodo(
    montarAgenda(
      events.data ?? [],
      (tasks.data ?? [])
        .filter((t) => t.status !== "concluida" && t.data_finalizar)
        .map((t) => ({ ...t, data_finalizar: t.data_finalizar! })),
      receivables.data ?? [],
    ),
    today,
    endIso,
  ).filter((i) => !i.concluido);
  const agendaToday = agenda.filter(
    (i) => i.data <= today && i.ate >= today,
  ).length;
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const todayRoutine = (routine.data ?? [])
    .filter((r) => r.dias.includes(weekday))
    .sort(
      (a, b) =>
        rotinaHorarioOrdem(a.horario) - rotinaHorarioOrdem(b.horario) ||
        a.ordem - b.ordem,
    );
  const focusDays = focoSemana(focus.data ?? [], today);
  const maxFocus = Math.max(1, ...focusDays.map((d) => d.seconds));
  const focusTotal = focusDays.reduce((s, d) => s + d.seconds, 0);
  const activeLeads = conversas.filter(conversaAtiva);
  const followups = activeLeads
    .filter((l) => l.proximo_contato && l.proximo_contato <= today)
    .sort((a, b) => a.proximo_contato!.localeCompare(b.proximo_contato!));
  const noteDone = (notes.data ?? []).filter((n) => n.concluida).length;
  const workItems = [...(work.data ?? [])].sort(
    (a, b) =>
      Number(a.status === "concluido") - Number(b.status === "concluido") ||
      (a.data_entrega || "9999").localeCompare(b.data_entrega || "9999"),
  );
  const areas = [
    {
      label: "Tarefas pendentes",
      value: t.open,
      detail: `${t.today} para hoje · ${t.late} atrasadas`,
      href: "/tarefas",
      error: tasks.error,
    },
    {
      label: "Projetos pessoais",
      value: p.items.length - p.completed,
      detail: `ativos · ${p.completed} com etapas concluídas`,
      href: "/projetos-pessoais",
      error: personal.error,
    },
    {
      label: "Agenda de hoje",
      value: agendaToday,
      detail: "eventos, tarefas e contas em aberto",
      href: `/agenda?dia=${today}`,
      error: agendaError,
    },
  ];
  return (
    <div className="flex flex-col gap-3" data-dashboard-overview>
      <section
        id="pessoal"
        aria-labelledby="pessoal-title"
        className="dashboard-zone dashboard-zone--personal scroll-mt-20"
      >
        <ZoneHeading
          id="pessoal-title"
          title="Pessoal"
          subtitle="Tarefas, projetos pessoais, agenda, foco e seus hábitos."
          number="01"
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {areas.map((a, i) => (
            <Link
              key={a.label}
              href={a.href}
              className={`erp-card dashboard-panel min-w-0 p-4 ${["erp-card--lavender", "erp-card--rose", "erp-card--peach", "erp-card--mint"][i]}`}
            >
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-mut">
                {a.label}
                <ArrowUpRight size={14} />
              </div>
              <div className="my-2 text-3xl font-extrabold tracking-tight text-ink">
                {a.error ? "—" : a.value}
              </div>
              <p className="text-xs leading-relaxed text-mut">
                {a.error ? "Dados indisponíveis" : a.detail}
              </p>
            </Link>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel
            title="Tarefas e prioridades"
            href="/tarefas"
            icon={<CheckCheck size={18} />}
            tint="erp-card--lavender"
          >
            {tasks.error ? (
              <Unavailable />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0">
                    <svg
                      viewBox="0 0 80 80"
                      className="h-full w-full -rotate-90"
                      role="img"
                      aria-label={`${t.pct}% das tarefas concluídas`}
                    >
                      <circle
                        cx="40"
                        cy="40"
                        r="33"
                        fill="none"
                        stroke="#E4DEED"
                        strokeWidth="7"
                      />
                      <circle
                        className="dashboard-ring"
                        cx="40"
                        cy="40"
                        r="33"
                        fill="none"
                        stroke="#C51E72"
                        strokeWidth="7"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray={`${t.pct} 100`}
                      />
                    </svg>
                    <b className="absolute inset-0 flex items-center justify-center text-lg text-ink">
                      {t.pct}%
                    </b>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {t.done} de {t.total} concluídas
                    </p>
                    <p className="mt-1 text-xs text-mut">
                      Todos os registros de tarefas
                    </p>
                    <p className="mt-1 text-xs text-danger">
                      {t.late} com prazo vencido
                    </p>
                  </div>
                </div>
                <div className="mt-3 divide-y divide-line">
                  {t.next.map((item) => (
                    <Link
                      key={item.id}
                      href="/tarefas"
                      className="flex items-start justify-between gap-3 py-2 text-xs"
                    >
                      <span className="min-w-0 break-words text-ink">
                        {item.titulo}
                      </span>
                      <span
                        className={`shrink-0 ${item.data_finalizar && item.data_finalizar < today ? "text-danger" : "text-mut"}`}
                      >
                        {item.data_finalizar
                          ? dateLabel(item.data_finalizar)
                          : "Sem prazo"}
                      </span>
                    </Link>
                  ))}
                </div>
                {!t.total && (
                  <Empty>
                    Crie suas primeiras tarefas para acompanhar o progresso.
                  </Empty>
                )}
                {t.total > 0 && !t.open && (
                  <Empty>Todas as tarefas estão concluídas.</Empty>
                )}
              </>
            )}
          </Panel>
          <Panel
            title="Agenda geral · próximos 7 dias"
            href={`/agenda?dia=${today}`}
            icon={<CalendarDays size={18} />}
          >
            {agendaError ? (
              <Unavailable />
            ) : !agenda.length ? (
              <Empty>
                Nenhum compromisso ou conta em aberto neste período.
              </Empty>
            ) : (
              <>
                <p className="mb-2 text-xs text-mut">
                  {agendaToday} para hoje · {agenda.length} no período,
                  incluindo tarefas e contas
                </p>
                <div className="max-h-64 divide-y divide-line overflow-y-auto pr-1">
                  {agenda.slice(0, 12).map((item) => (
                    <Link
                      key={item.id}
                      href={`/agenda?dia=${item.data < today ? today : item.data}&item=${encodeURIComponent(item.id)}`}
                      className="flex items-start gap-3 py-2.5"
                    >
                      <div
                        className="min-w-[42px] rounded-lg px-1.5 py-1 text-center text-xs font-bold"
                        style={{
                          background: AGENDA_TIPOS[item.tipo].tint,
                          color: AGENDA_TIPOS[item.tipo].cor,
                        }}
                      >
                        {item.data <= today ? "Hoje" : dateLabel(item.data)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[13px] font-semibold text-ink">
                          {item.titulo}
                        </p>
                        <p className="mt-0.5 text-xs text-mut">
                          {item.horario} · {AGENDA_TIPOS[item.tipo].label}
                        </p>
                      </div>
                      {item.valor !== null && (
                        <b className="shrink-0 text-xs text-ink">
                          {agendaMoney(item.valor, item.moeda)}
                        </b>
                      )}
                    </Link>
                  ))}
                </div>
                {agenda.length > 12 && (
                  <Link
                    href="/agenda"
                    className="mt-2 block text-xs font-semibold text-brand"
                  >
                    Ver os {agenda.length} itens na agenda →
                  </Link>
                )}
              </>
            )}
          </Panel>
          <Panel
            title="Projetos pessoais"
            href="/projetos-pessoais"
            icon={<FolderHeart size={18} />}
            tint="erp-card--rose"
          >
            {personal.error ? (
              <Unavailable />
            ) : (
              <>
                <div className="flex justify-between gap-2 text-xs text-mut">
                  <span>
                    {p.done}/{p.total} etapas concluídas
                  </span>
                  <b className="text-brand">{p.pct}%</b>
                </div>
                <Progress
                  value={p.pct}
                  label="Etapas de todos os projetos pessoais"
                />
                <p className="mt-2 text-xs text-mut">
                  {p.notesDone}/{p.notes} anotações concluídas · {p.late}{" "}
                  projetos com prazos vencidos
                </p>
                <div className="mt-3 divide-y divide-line">
                  {p.items.slice(0, 4).map((item) => (
                    <Link
                      href="/projetos-pessoais"
                      key={item.id}
                      className="block py-2"
                    >
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <b className="min-w-0 break-words text-ink">
                          {item.titulo}
                        </b>
                        <span className="shrink-0 text-mut">
                          {item.total ? `${item.pct}%` : "Sem etapas"}
                        </span>
                      </div>
                      <Progress
                        value={item.pct}
                        label={`Etapas de ${item.titulo}`}
                      />
                      <div
                        className={`mt-1 text-[11px] ${item.late || item.lateSteps ? "text-danger" : "text-mut"}`}
                      >
                        {item.completed
                          ? "Etapas concluídas"
                          : item.prazo
                            ? `Prazo ${dateLabel(item.prazo)}`
                            : "Sem prazo definido"}
                        {item.lateSteps > 0
                          ? ` · ${item.lateSteps} etapas atrasadas`
                          : ""}
                      </div>
                    </Link>
                  ))}
                </div>
                {!p.items.length && (
                  <Empty>
                    Cadastre aplicativos, sites e outros projetos pessoais.
                  </Empty>
                )}
              </>
            )}
          </Panel>

          <Panel
            title="Foco · últimos 7 dias"
            href="/tracker"
            icon={<Timer size={18} />}
            tint="erp-card--mint"
          >
            {focus.error ? (
              <Unavailable />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <b className="text-2xl font-extrabold text-ink">
                    {formatDuracao(focusTotal)}
                  </b>
                  <span className="text-xs text-mut">de foco registrado</span>
                </div>
                <div
                  className="mt-4 flex h-36 items-end gap-2"
                  role="img"
                  aria-label={focusDays
                    .map(
                      (d) =>
                        `${dateLabel(d.date)}: ${formatDuracao(d.seconds)}`,
                    )
                    .join("; ")}
                >
                  {focusDays.map((d) => (
                    <div
                      key={d.date}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                    >
                      <span className="text-[10px] text-mut">
                        {d.seconds ? `${Math.round(d.seconds / 60)}m` : "0"}
                      </span>
                      <div className="relative w-full max-w-10 flex-1">
                        <div
                          className={`dashboard-column absolute bottom-0 w-full rounded-t-md ${d.date === today ? "bg-gradient-to-t from-brand to-[#FF7939]" : "bg-[#0E9F6E]/60"}`}
                          style={{ height: `${(d.seconds / maxFocus) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-mut">{d.label}</span>
                    </div>
                  ))}
                </div>
                {!focusTotal && (
                  <p className="mt-2 text-xs text-mut">
                    Inicie uma sessão no Time Tracker para preencher o gráfico.
                  </p>
                )}
              </>
            )}
          </Panel>
          <Panel
            title="Rotina e dieta · hoje"
            href="/rotina-dieta"
            icon={<Utensils size={18} />}
            tint="erp-card--peach"
          >
            {routine.error ? (
              <Unavailable />
            ) : (
              <>
                <p className="mb-2 text-xs text-mut">
                  {todayRoutine.filter((r) => r.tipo === "rotina").length}{" "}
                  atividades ·{" "}
                  {todayRoutine.filter((r) => r.tipo === "refeicao").length}{" "}
                  refeições programadas
                </p>
                <div className="max-h-60 divide-y divide-line overflow-y-auto pr-1">
                  {todayRoutine.map((r) => (
                    <Link
                      href="/rotina-dieta"
                      key={r.id}
                      className="flex items-start gap-3 py-2"
                    >
                      <b className="rounded-md bg-white/80 px-2 py-1 text-xs text-brand">
                        {r.horario}
                      </b>
                      <div className="min-w-0">
                        <p className="break-words text-[13px] text-ink">
                          {r.titulo}
                        </p>
                        <p className="text-[11px] text-mut">
                          {r.tipo === "refeicao" ? "Refeição" : "Atividade"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                {!todayRoutine.length && (
                  <Empty>Nenhum item programado para este dia da semana.</Empty>
                )}
                <p className="mt-3 border-t border-line pt-2 text-[11px] text-mut">
                  Programação cadastrada. O ERP ainda não registra o cumprimento
                  da rotina ou da dieta.
                </p>
              </>
            )}
          </Panel>
        </div>
        <Panel
          title="Anotações e regras"
          href="/anotacoes"
          icon={<NotebookPen size={18} />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              {notes.error ? (
                <Unavailable />
              ) : (
                <>
                  <Link
                    href="/anotacoes"
                    className="text-sm font-bold text-ink"
                  >
                    Anotações →
                  </Link>
                  <p className="mt-2 text-xs text-mut">
                    {noteDone} concluídas ·{" "}
                    {(notes.data ?? []).length - noteDone} pendentes
                  </p>
                  <Progress
                    value={percentual(noteDone, (notes.data ?? []).length)}
                    label="Anotações concluídas"
                  />
                  <p className="mt-2 text-xs text-mut">
                    {
                      (notes.data ?? []).filter(
                        (n) =>
                          !n.concluida && n.due && agendaDate(n.due) < today,
                      ).length
                    }{" "}
                    pendentes com prazo vencido
                  </p>
                </>
              )}
            </div>
            <div className="border-line sm:border-l sm:pl-4">
              {categories.error || rules.error ? (
                <Unavailable />
              ) : (
                <>
                  <Link href="/regras" className="text-sm font-bold text-ink">
                    Regras →
                  </Link>
                  <p className="mt-2 text-xs text-mut">
                    {(rules.data ?? []).length} tópicos em{" "}
                    {(categories.data ?? []).length} categorias
                  </p>
                  <p className="mt-2 text-xs text-mut">
                    {
                      (categories.data ?? []).filter(
                        (c) =>
                          !(rules.data ?? []).some(
                            (r) => r.categoria_id === c.id,
                          ),
                      ).length
                    }{" "}
                    categorias aguardando regras
                  </p>
                  <p className="mt-2 text-[11px] text-mut">
                    Consulte seus princípios e mantenha suas categorias
                    organizadas.
                  </p>
                </>
              )}
            </div>
          </div>
        </Panel>
      </section>
      <section
        id="comercial"
        aria-labelledby="comercial-title"
        className="dashboard-zone dashboard-zone--business scroll-mt-20"
      >
        <ZoneHeading
          id="comercial-title"
          title="Comercial"
          subtitle="Projetos de trabalho, clientes e resultados da prospecção."
          number="02"
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            {
              label: "Projetos de trabalho ativos",
              value: work.error
                ? "—"
                : workItems.filter((p) => p.status !== "concluido").length,
              href: "/projetos",
            },
            {
              label: "Leads em conversa",
              value: conversasErro ? "—" : activeLeads.length,
              href: "/prospeccao?aba=leads",
            },
            {
              label: "Retornos pendentes",
              value: conversasErro ? "—" : followups.length,
              href: "/prospeccao?aba=leads",
            },
            {
              label: "Clientes cadastrados",
              value: clientesTotal ?? "—",
              href: "/crm",
            },
          ].map((a) => (
            <Link key={a.label} href={a.href} className="erp-card min-w-0 p-4">
              <p className="text-xs font-semibold text-mut">{a.label}</p>
              <b className="mt-2 block text-3xl text-ink">{a.value}</b>
            </Link>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel
            title="Projetos de trabalho"
            href="/projetos"
            icon={<Sparkles size={18} />}
          >
            {work.error ? (
              <Unavailable />
            ) : !workItems.length ? (
              <Empty>Nenhum projeto de trabalho cadastrado.</Empty>
            ) : (
              <>
                <p className="mb-3 text-xs text-mut">
                  {workItems.filter((p) => p.status !== "concluido").length}{" "}
                  ativos ·{" "}
                  {workItems.filter((p) => p.status === "concluido").length}{" "}
                  concluídos
                </p>
                <div className="divide-y divide-line">
                  {workItems.slice(0, 4).map((item) => (
                    <Link
                      href={`/projetos?p=${item.id}`}
                      key={item.id}
                      className="block py-2"
                    >
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <b className="min-w-0 break-words text-ink">
                          {item.titulo}
                        </b>
                        <span className="shrink-0 text-mut">
                          {percentual(Number(item.progresso), 100)}%
                        </span>
                      </div>
                      <Progress
                        value={percentual(Number(item.progresso), 100)}
                        label={`Progresso de ${item.titulo}`}
                      />
                      <p
                        className={`mt-1 text-[11px] ${item.status !== "concluido" && item.data_entrega && item.data_entrega < today ? "text-danger" : "text-mut"}`}
                      >
                        {item.status === "concluido"
                          ? "Concluído"
                          : item.data_entrega
                            ? `Entrega ${dateLabel(item.data_entrega)}`
                            : "Sem data de entrega"}
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Panel>
          <Panel
            title="Leads em conversa"
            href="/prospeccao?aba=leads"
            icon={<Sparkles size={18} />}
          >
            {conversasErro ? (
              <Unavailable />
            ) : (
              <>
                <p className="mb-3 text-xs text-mut">
                  {activeLeads.length} em andamento · {followups.length}{" "}
                  retornos para hoje ou atrasados
                </p>
                <div className="space-y-2">
                  {Object.entries(CONVERSA_STATUS).map(([status, label]) => {
                    const count = conversas.filter(
                      (l) => l.status === status,
                    ).length;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs">
                          <span className="text-mut">{label}</span>
                          <b className="text-ink">{count}</b>
                        </div>
                        <Progress
                          value={percentual(count, conversas.length)}
                          label={`${label}: ${count} de ${conversas.length} leads`}
                        />
                      </div>
                    );
                  })}
                </div>
                {followups.length > 0 && (
                  <div className="mt-3 rounded-lg bg-soft p-2 text-xs text-ink">
                    <b>Próximos retornos</b>
                    {followups.slice(0, 3).map((l) => (
                      <Link
                        href="/prospeccao?aba=leads"
                        key={l.id}
                        className="mt-1 flex justify-between gap-2"
                      >
                        <span className="truncate">{l.nome}</span>
                        <span className="shrink-0 text-brand">
                          {dateLabel(l.proximo_contato!)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                {!conversas.length && (
                  <Empty>
                    Cadastre aqui os contatos que responderam à prospecção.
                  </Empty>
                )}
              </>
            )}
          </Panel>
          <Panel
            title="Canais de prospecção · mês"
            href="/prospeccao"
            icon={<Sparkles size={18} />}
          >
            {canais === null ? (
              <Unavailable />
            ) : !canais.length ? (
              <Empty>
                Registre contatos e respostas para comparar suas estratégias.
              </Empty>
            ) : (
              <>
                <p className="mb-3 text-xs text-mut">
                  Barras mostram o volume de contatos. Taxa = respostas ÷
                  contatos registrados no mês.
                </p>
                <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
                  {[...canais]
                    .sort((a, b) => b.contatos - a.contatos)
                    .map((c) => (
                      <div key={c.canalId}>
                        <div className="flex justify-between gap-2 text-xs">
                          <b className="text-ink">{canalLabel(c.nome)}</b>
                          <span className="text-mut">
                            {c.contatos} contatos
                          </span>
                        </div>
                        <Progress
                          value={percentual(
                            c.contatos,
                            Math.max(1, ...canais.map((c) => c.contatos)),
                          )}
                          label={`Volume de ${canalLabel(c.nome)}: ${c.contatos} contatos`}
                        />
                        <p className="mt-1 text-[11px] text-mut">
                          {c.respostas} respostas · {c.propostas} propostas ·{" "}
                          {c.contatos
                            ? `${c.taxaResposta}% de resposta`
                            : "taxa sem base de contatos"}
                        </p>
                      </div>
                    ))}
                </div>
              </>
            )}
          </Panel>
          <Panel
            title="Prospecção · totais do mês"
            href="/prospeccao"
            icon={<Sparkles size={18} />}
            tint="erp-card--rose"
          >
            {canais === null ? (
              <Unavailable />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Contatos",
                      value: canais.reduce((s, c) => s + c.contatos, 0),
                    },
                    {
                      label: "Respostas",
                      value: canais.reduce((s, c) => s + c.respostas, 0),
                    },
                    {
                      label: "Propostas",
                      value: canais.reduce((s, c) => s + c.propostas, 0),
                    },
                    {
                      label: "Vendas",
                      value: canais.reduce((s, c) => s + c.vendas, 0),
                    },
                  ].map((c) => (
                    <div
                      key={c.label}
                      className="rounded-xl border border-line bg-white/75 p-3"
                    >
                      <b className="block text-2xl text-ink">{c.value}</b>
                      <span className="text-xs text-mut">{c.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-mut">
                  Totais dos registros diários. Os leads em conversa são
                  acompanhados separadamente, sem somar as duas bases.
                </p>
              </>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}
