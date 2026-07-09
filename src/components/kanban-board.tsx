"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

export type KanbanCard = {
  id: string;
  title: string;
  valor: string;
  prazo: string;
  progress: number;
  risk: number | null;
  done: boolean;
};

export type KanbanColumn = {
  id: Enums<"projeto_status">;
  name: string;
  cards: KanbanCard[];
};

export function KanbanBoard({ initialColumns }: { initialColumns: KanbanColumn[] }) {
  const [cols, setCols] = useState<KanbanColumn[]>(initialColumns);
  const drag = useRef<{ cardId: string; from: Enums<"projeto_status"> } | null>(null);
  const supabase = createClient();

  async function onDrop(toId: Enums<"projeto_status">) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.from === toId) return;

    setCols((prev) => {
      const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
      const src = next.find((c) => c.id === d.from);
      const dst = next.find((c) => c.id === toId);
      if (!src || !dst) return prev;
      const idx = src.cards.findIndex((x) => x.id === d.cardId);
      if (idx < 0) return prev;
      const [moved] = src.cards.splice(idx, 1);
      dst.cards.push({ ...moved, done: toId === "concluido" });
      return next;
    });

    await supabase.from("projetos").update({ status: toId }).eq("id", d.cardId);
  }

  return (
    <div className="thin-scroll overflow-x-auto pb-1">
      <div className="grid min-w-[1100px] grid-cols-7 items-start gap-2">
        {cols.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.id)}
            className="flex min-h-[280px] flex-col gap-2 rounded-[10px] border border-line bg-soft-2 p-2"
          >
            <div className="flex items-center gap-1.5 px-0.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.07em] text-mut">
              <span>{col.name}</span>
              <span className="rounded-full border border-line bg-card px-1.5 text-[9.5px]">{col.cards.length}</span>
            </div>

            {col.cards.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={() => (drag.current = { cardId: c.id, from: col.id })}
                className="flex cursor-grab flex-col gap-1.5 rounded-[9px] border border-line bg-card p-2.5 shadow-[0_1px_2px_rgba(10,26,51,.05)] transition-colors hover:border-brand active:cursor-grabbing"
              >
                <b className="text-[12px] leading-tight text-ink">{c.title}</b>
                {c.progress > 0 && (
                  <div className="h-[5px] overflow-hidden rounded-full bg-soft-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.progress}%`, background: c.done ? "#0E9F6E" : "#1D5BFF" }}
                    />
                  </div>
                )}
                <div className="text-[10.5px] text-mut">
                  {c.valor} · {c.prazo}
                </div>
                {c.risk != null && (
                  <span className="self-start whitespace-nowrap rounded-full border border-danger/40 bg-danger/[0.08] px-[7px] py-0.5 text-[9.5px] font-bold text-danger">
                    ⚠ {c.risk}% risco de atraso
                  </span>
                )}
                {c.done && (
                  <span className="self-start rounded-full border border-ok/35 bg-ok/[0.08] px-[7px] py-0.5 text-[9.5px] font-bold text-ok">
                    ✓ entregue e pago
                  </span>
                )}
              </div>
            ))}

            {col.cards.length === 0 && (
              <div className="flex min-h-[52px] items-center justify-center rounded-lg border-[1.5px] border-dashed border-line text-[10.5px] text-mut">
                solte aqui
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
