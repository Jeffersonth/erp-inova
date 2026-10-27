"use client";

import { Bell, CalendarDays, Plus, Sun } from "lucide-react";
import { AgendaItemList } from "@/components/agenda-item-list";
import { agendaDestaques, type AgendaItem } from "@/lib/agenda-items";

export function AgendaHighlights({
  items,
  today,
  onEdit,
  onPago,
  onAdd,
  busy,
}: {
  items: AgendaItem[];
  today: string;
  onEdit: (item: AgendaItem) => void;
  onPago: (item: AgendaItem, pago: boolean) => void;
  onAdd: () => void;
  busy: boolean;
}) {
  const { hoje, lembretes } = agendaDestaques(items, today);
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
  }).format(new Date(today + "T12:00:00Z"));
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <section
        aria-label="Destaques de hoje"
        className="min-w-0 overflow-hidden rounded-2xl border-2 border-brand/35 bg-[#FCE9F2] shadow-[0_6px_20px_-14px_rgba(197,30,114,.5)]"
      >
        <header className="flex items-center gap-2 border-b border-brand/15 bg-brand/[.07] px-4 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <Sun size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-[#8C164F]">
              Hoje merece sua atenção
            </h2>
            <p className="text-xs text-[#8C164F]">
              {todayLabel} · compromissos, tarefas e pagamentos
            </p>
          </div>
          <span
            aria-label={`${hoje.length} itens de hoje`}
            className="flex min-w-7 items-center justify-center rounded-full bg-brand px-2 py-1 text-xs font-extrabold text-white"
          >
            {hoje.length}
          </span>
        </header>
        <div className="thin-scroll max-h-[360px] overflow-y-auto p-4 lg:max-h-[420px]">
          {hoje.length ? (
            <AgendaItemList
              items={hoje}
              onEdit={onEdit}
              onPago={onPago}
              busy={busy}
              highlightDay={today}
            />
          ) : (
            <p className="flex items-center gap-2 py-5 text-sm text-[#8C164F]">
              <CalendarDays size={16} className="shrink-0" />
              Nenhum item agendado para hoje. Seu dia está livre na agenda.
            </p>
          )}
        </div>
      </section>
      <section
        aria-label="Todos os lembretes"
        className="min-w-0 overflow-hidden rounded-2xl border border-[#E2C784] bg-[#FFF7E4]"
      >
        <header className="flex flex-wrap items-center gap-2 border-b border-[#E2C784]/60 bg-[#F7E8BC]/50 px-4 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F2D58E] text-[#795315]">
            <Bell size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-[#795315]">
              Seus lembretes{" "}
              <span className="ml-1 text-xs font-semibold">
                ({lembretes.length})
              </span>
            </h2>
            <p className="text-xs text-[#795315]">
              Lembretes e datas importantes · todos os períodos
            </p>
          </div>
          <button
            disabled={busy}
            onClick={onAdd}
            aria-label="Adicionar lembrete"
            className="flex items-center gap-1 rounded-lg border border-[#D8B567] bg-white px-2 py-1.5 text-[11px] font-bold text-[#795315] disabled:opacity-50"
          >
            <Plus size={13} />
            Novo
          </button>
        </header>
        <div className="thin-scroll max-h-[360px] overflow-y-auto p-4 lg:max-h-[420px]">
          {lembretes.length ? (
            <AgendaItemList
              items={lembretes}
              onEdit={onEdit}
              busy={busy}
              highlightDay={today}
              showDate
            />
          ) : (
            <p className="py-5 text-sm text-[#795315]">
              Nenhum lembrete cadastrado. Use “Novo” para adicionar o primeiro.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
