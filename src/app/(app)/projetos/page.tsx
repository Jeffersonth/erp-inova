"use client";

import { useRef, useState } from "react";
import { IaBadge } from "@/components/ia-badge";
import { DraftButton } from "@/components/draft-button";
import { toneText } from "@/lib/tone";
import {
  kanban,
  checklistLandingX,
  etapasLandingX,
  arquivosLandingX,
  type KanbanColumn,
} from "@/lib/mock-data";

const card = "rounded-xl border border-line bg-card";

export default function ProjetosPage() {
  const [cols, setCols] = useState<KanbanColumn[]>(() =>
    structuredClone(kanban),
  );
  const drag = useRef<{ cardId: string; from: string } | null>(null);

  function onDrop(toId: string) {
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
      dst.cards.push(moved);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Projetos</h1>
        <span className="text-[11.5px] text-mut">arraste os cards entre as colunas</span>
        <button className="ml-auto rounded-lg bg-brand px-3.5 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark">
          + Novo projeto
        </button>
      </div>

      {/* Kanban */}
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
                  {c.etapa && (
                    <div className="border-t border-dashed border-line pt-1.5 text-[10px] text-mut">{c.etapa}</div>
                  )}
                  {c.risk != null && (
                    <span className="self-start whitespace-nowrap rounded-full border border-danger/40 bg-danger/[0.08] px-[7px] py-0.5 text-[9.5px] font-bold text-danger">
                      ⚠ {c.risk}% risco de atraso
                    </span>
                  )}
                  {c.ia && (
                    <span className="self-start whitespace-nowrap rounded-full border border-aqua/45 bg-aqua/10 px-[7px] py-0.5 text-[9.5px] font-extrabold tracking-[0.05em] text-ia">
                      IA rascunhou
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

      {/* Checklist inteligente */}
      <div className={`${card} px-3.5 py-3`}>
        <div className="flex items-center gap-2">
          <b className="text-[12.5px] text-ink">Checklist inteligente — Landing X</b>
          <span className="text-[11px] font-semibold text-ia">a IA marca itens detectados em e-mails e commits</span>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
          {checklistLandingX.map((item) => (
            <div key={item.texto} className="flex items-center gap-2">
              <span className={item.done ? "font-bold text-ok" : "text-mut"}>{item.done ? "☑" : "☐"}</span>
              <span className={item.done ? "text-mut line-through" : "text-ink"}>{item.texto}</span>
              {item.ia && <span className="text-[10px] text-ia">{item.ia}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Prazos + Arquivos */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.4fr_1fr]">
        {/* Prazos por etapa */}
        <div className={`${card} overflow-hidden`}>
          <div className="flex items-center gap-2 px-3.5 pt-3">
            <b className="text-[12.5px] text-ink">Prazos por etapa — Landing X</b>
            <DraftButton
              draftKey="prazosIA"
              label="✦ Distribuir prazos (IA)"
              className="ml-auto border-aqua/45 text-ia hover:bg-aqua/10"
            />
          </div>
          <div className="mt-2 grid grid-cols-[1.3fr_0.8fr_1fr_1.1fr] gap-2 border-b border-line px-3.5 py-2 text-[10px] font-semibold tracking-[0.07em] text-mut">
            <span>ETAPA</span>
            <span>PRAZO</span>
            <span>STATUS</span>
            <span>DURAÇÃO VS MÉDIA</span>
          </div>
          {etapasLandingX.map((e) => (
            <div
              key={e.nome}
              className="grid grid-cols-[1.3fr_0.8fr_1fr_1.1fr] items-center gap-2 border-b border-line px-3.5 py-[7px] text-[12px] last:border-b-0"
            >
              <span className={e.bold ? "font-bold text-ink" : "text-ink"}>{e.nome}</span>
              <span className={`font-semibold ${toneText[e.prazoTone ?? "mut"]}`}>{e.prazo}</span>
              <span className={`font-semibold ${toneText[e.statusTone]}`}>{e.status}</span>
              <span className={`${e.durTone ? "font-semibold " : ""}${toneText[e.durTone ?? "mut"]}`}>{e.dur}</span>
            </div>
          ))}
        </div>

        {/* Arquivos do projeto */}
        <div className={`${card} flex flex-col gap-2 px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[12.5px] text-ink">Arquivos do projeto</b>
            <span className="text-[10.5px] font-semibold text-ia">tipos classificados pela IA</span>
          </div>
          {arquivosLandingX.map((f) => (
            <div key={f.nome} className="flex items-center gap-2.5 border-t border-line py-[7px] text-[12px]">
              <span className="flex size-[26px] flex-none items-center justify-center rounded-md border border-line bg-soft text-[11px]">
                {f.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{f.nome}</span>
              <IaBadge className="ml-auto text-ia">{f.tipo}</IaBadge>
            </div>
          ))}
          <DraftButton
            draftKey="contrato"
            label="✦ Gerar contrato (IA)"
            solid
            className="mt-auto w-full justify-center py-2.5 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
