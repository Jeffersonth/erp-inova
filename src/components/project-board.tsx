"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/components/app-providers";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TIPO_META, TIPO_ORDER, type TarefaTipo } from "@/lib/tarefa-tipos";

export type BoardTarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: TarefaTipo;
  concluida: boolean;
  ordem: number;
};

export type BoardEtapa = {
  id: string;
  nome: string;
  ordem: number;
  final: boolean;
  tarefas: BoardTarefa[];
};

const field =
  "w-full rounded-lg border border-line bg-soft px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand";

export function ProjectBoard({
  projetoId,
  userId,
  initialEtapas,
}: {
  projetoId: string;
  userId: string;
  initialEtapas: BoardEtapa[];
}) {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();

  const [cols, setCols] = useState<BoardEtapa[]>(initialEtapas);
  const [adding, setAdding] = useState<Record<string, { titulo: string; tipo: TarefaTipo }>>({});
  const [editing, setEditing] = useState<{ etapaId: string; card: BoardTarefa } | null>(null);
  const [novaEtapa, setNovaEtapa] = useState<string | null>(null);
  const drag = useRef<{ cardId: string; from: string } | null>(null);
  const dragging = useRef(false);

  const { total, done, pct } = useMemo(() => {
    const all = cols.flatMap((c) => c.tarefas);
    const d = all.filter((t) => t.concluida).length;
    return { total: all.length, done: d, pct: all.length ? Math.round((d / all.length) * 100) : 0 };
  }, [cols]);

  async function persistProgresso(next: BoardEtapa[]) {
    const all = next.flatMap((c) => c.tarefas);
    const d = all.filter((t) => t.concluida).length;
    const p = all.length ? Math.round((d / all.length) * 100) : 0;
    await supabase.from("projetos").update({ progresso: p }).eq("id", projetoId);
  }

  async function addCard(etapaId: string) {
    const draft = adding[etapaId];
    const titulo = draft?.titulo.trim();
    if (!titulo) return;
    const etapa = cols.find((c) => c.id === etapaId);
    const ordem = etapa ? etapa.tarefas.length : 0;
    const tipo = draft.tipo;

    const { data, error } = await supabase
      .from("tarefas")
      .insert({ user_id: userId, projeto_id: projetoId, etapa_id: etapaId, titulo, tipo, ordem, concluida: etapa?.final ?? false })
      .select("id, titulo, descricao, tipo, concluida, ordem")
      .single();

    if (error || !data) {
      toast("Não foi possível adicionar o card");
      return;
    }
    const next = cols.map((c) =>
      c.id === etapaId ? { ...c, tarefas: [...c.tarefas, data as BoardTarefa] } : c,
    );
    setCols(next);
    persistProgresso(next);
    setAdding((prev) => ({ ...prev, [etapaId]: { titulo: "", tipo } }));
  }

  async function toggleDone(etapaId: string, cardId: string) {
    const etapa = cols.find((c) => c.id === etapaId);
    const alvo = etapa?.tarefas.find((t) => t.id === cardId);
    if (!alvo) return;
    const novoValor = !alvo.concluida;
    const next = cols.map((c) =>
      c.id === etapaId
        ? { ...c, tarefas: c.tarefas.map((t) => (t.id === cardId ? { ...t, concluida: novoValor } : t)) }
        : c,
    );
    setCols(next);
    persistProgresso(next);
    await supabase.from("tarefas").update({ concluida: novoValor }).eq("id", cardId);
  }

  async function onDrop(toId: string) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.from === toId) return;
    const alvo = cols.find((c) => c.id === toId);
    const concluir = alvo?.final ?? false;
    const src = cols.find((c) => c.id === d.from);
    const moved = src?.tarefas.find((t) => t.id === d.cardId);
    if (!moved) return;

    const next = cols.map((c) => {
      if (c.id === d.from) return { ...c, tarefas: c.tarefas.filter((t) => t.id !== d.cardId) };
      if (c.id === toId) return { ...c, tarefas: [...c.tarefas, { ...moved, concluida: concluir || moved.concluida }] };
      return c;
    });
    setCols(next);
    persistProgresso(next);

    await supabase
      .from("tarefas")
      .update({ etapa_id: toId, concluida: concluir ? true : undefined })
      .eq("id", d.cardId);
  }

  async function saveCard(titulo: string, tipo: TarefaTipo, descricao: string) {
    if (!editing) return;
    const t = titulo.trim();
    if (!t) return;
    const desc = descricao.trim() || null;
    setCols((prev) =>
      prev.map((c) =>
        c.id === editing.etapaId
          ? {
              ...c,
              tarefas: c.tarefas.map((x) =>
                x.id === editing.card.id ? { ...x, titulo: t, tipo, descricao: desc } : x,
              ),
            }
          : c,
      ),
    );
    setEditing(null);
    await supabase.from("tarefas").update({ titulo: t, tipo, descricao: desc }).eq("id", editing.card.id);
  }

  async function deleteCard() {
    if (!editing) return;
    const { etapaId, card } = editing;
    setEditing(null);
    const next = cols.map((c) =>
      c.id === etapaId ? { ...c, tarefas: c.tarefas.filter((t) => t.id !== card.id) } : c,
    );
    setCols(next);
    persistProgresso(next);
    await supabase.from("tarefas").delete().eq("id", card.id);
  }

  async function addEtapa() {
    const nome = novaEtapa?.trim();
    if (!nome) {
      setNovaEtapa(null);
      return;
    }
    const ordem = cols.length;
    const { error } = await supabase
      .from("etapas")
      .insert({ projeto_id: projetoId, nome, ordem, final: false });
    setNovaEtapa(null);
    if (error) {
      toast("Não foi possível criar a etapa");
      return;
    }
    router.refresh();
  }

  async function renameEtapa(etapaId: string, nome: string) {
    const n = nome.trim();
    if (!n) return;
    setCols((prev) => prev.map((c) => (c.id === etapaId ? { ...c, nome: n } : c)));
    await supabase.from("etapas").update({ nome: n }).eq("id", etapaId);
  }

  async function deleteEtapa(etapa: BoardEtapa) {
    const aviso =
      etapa.tarefas.length > 0
        ? `Excluir a etapa "${etapa.nome}" e os ${etapa.tarefas.length} card(s) dentro dela?`
        : `Excluir a etapa "${etapa.nome}"?`;
    if (!confirm(aviso)) return;
    const next = cols.filter((c) => c.id !== etapa.id);
    setCols(next);
    persistProgresso(next);
    await supabase.from("etapas").delete().eq("id", etapa.id);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Progresso */}
      <div className="flex items-center gap-2.5">
        <span className="whitespace-nowrap text-[12.5px] text-mut">
          {done} de {total} concluídas
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-line bg-soft-2">
          <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[12.5px] font-semibold text-ok">{pct}%</span>
      </div>

      {/* Quadro */}
      <div className="thin-scroll overflow-x-auto pb-1">
        <div className="flex min-w-max items-start gap-2">
          {cols.map((col) => (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
              className="flex w-[188px] flex-none flex-col gap-2 rounded-[10px] border border-line bg-soft-2 p-2"
            >
              <div className="flex items-center gap-1.5 px-0.5 pt-0.5">
                <input
                  defaultValue={col.nome}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value.trim() !== col.nome) renameEtapa(col.id, e.target.value);
                  }}
                  className="min-w-0 flex-1 bg-transparent text-[11.5px] font-bold uppercase tracking-[0.06em] text-mut outline-none focus:text-ink"
                />
                {col.final && <span className="text-[11px] text-ok" title="Etapa de conclusão">✓</span>}
                <span className="rounded-full border border-line bg-card px-1.5 text-[10.5px] text-mut">
                  {col.tarefas.length}
                </span>
                <button
                  type="button"
                  onClick={() => deleteEtapa(col)}
                  aria-label={`Excluir etapa ${col.nome}`}
                  title="Excluir etapa"
                  className="flex size-4 flex-none items-center justify-center rounded text-mut transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  ✕
                </button>
              </div>

              {col.tarefas.map((t) => {
                const meta = TIPO_META[t.tipo];
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => {
                      dragging.current = true;
                      drag.current = { cardId: t.id, from: col.id };
                    }}
                    onDragEnd={() => (dragging.current = false)}
                    onClick={() => {
                      if (dragging.current) return;
                      setEditing({ etapaId: col.id, card: t });
                    }}
                    className="cursor-grab rounded-[8px] border p-2 shadow-[0_1px_2px_rgba(10,26,51,.05)] transition-colors active:cursor-grabbing"
                    style={
                      t.concluida
                        ? { background: "#F4F7FB", borderColor: "#DCE4F0" }
                        : { background: meta.tint, borderColor: meta.border }
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDone(col.id, t.id);
                        }}
                        aria-label={t.concluida ? "Reabrir tarefa" : "Concluir tarefa"}
                        title={t.concluida ? "Reabrir" : "Concluir"}
                        className="flex size-4 flex-none items-center justify-center rounded-full border text-[11px] leading-none transition-colors"
                        style={
                          t.concluida
                            ? { background: "#0E9F6E", borderColor: "#0E9F6E", color: "#fff" }
                            : { borderColor: "#B7C4DA", color: "transparent" }
                        }
                      >
                        ✓
                      </button>
                      <span
                        className="rounded-full bg-card px-1.5 py-px text-[11px] font-semibold"
                        style={{ color: t.concluida ? "#8DA2C0" : meta.text }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div
                      className={`mt-1.5 text-[13px] font-semibold leading-snug ${t.concluida ? "text-mut line-through" : "text-ink"}`}
                    >
                      {t.titulo}
                    </div>
                    {t.descricao && (
                      <div className={`mt-0.5 line-clamp-3 text-[12px] leading-snug ${t.concluida ? "text-mut" : "text-mut"}`}>
                        {t.descricao}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Adicionar card */}
              <AddCardForm
                value={adding[col.id] ?? { titulo: "", tipo: "dev" }}
                onChange={(v) => setAdding((prev) => ({ ...prev, [col.id]: v }))}
                onSubmit={() => addCard(col.id)}
              />
            </div>
          ))}

          {/* Nova etapa */}
          <div className="w-[188px] flex-none">
            {novaEtapa === null ? (
              <button
                type="button"
                onClick={() => setNovaEtapa("")}
                className="flex w-full items-center justify-center gap-1 rounded-[10px] border border-dashed border-line py-2 text-[12.5px] font-semibold text-mut transition-colors hover:border-brand hover:text-brand"
              >
                + Etapa
              </button>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-[10px] border border-line bg-soft-2 p-2">
                <input
                  autoFocus
                  value={novaEtapa}
                  onChange={(e) => setNovaEtapa(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addEtapa();
                    if (e.key === "Escape") setNovaEtapa(null);
                  }}
                  placeholder="Nome da etapa"
                  className={field}
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={addEtapa}
                    className="flex-1 rounded-lg bg-brand px-2 py-1 text-[12px] font-semibold text-white hover:bg-brand-dark"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovaEtapa(null)}
                    className="rounded-lg border border-line px-2 py-1 text-[12px] font-semibold text-ink hover:border-brand"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-line pt-2.5">
        {TIPO_ORDER.map((tipo) => (
          <span key={tipo} className="flex items-center gap-1.5 text-[12px] text-mut">
            <span className="size-2 rounded-full" style={{ background: TIPO_META[tipo].color }} />
            {TIPO_META[tipo].label}
          </span>
        ))}
      </div>

      {/* Dialog de edição do card */}
      <EditCardDialog
        card={editing?.card ?? null}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={saveCard}
        onDelete={deleteCard}
      />
    </div>
  );
}

function AddCardForm({
  value,
  onChange,
  onSubmit,
}: {
  value: { titulo: string; tipo: TarefaTipo };
  onChange: (v: { titulo: string; tipo: TarefaTipo }) => void;
  onSubmit: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded-[8px] border border-dashed border-line py-1.5 text-[12.5px] text-mut transition-colors hover:border-brand hover:text-brand"
      >
        + Card
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-1.5 rounded-[8px] border border-line bg-card p-1.5"
    >
      <input
        autoFocus
        value={value.titulo}
        onChange={(e) => onChange({ ...value, titulo: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Título do card"
        className={field}
      />
      <div className="flex flex-wrap gap-1">
        {TIPO_ORDER.map((tipo) => {
          const active = value.tipo === tipo;
          const meta = TIPO_META[tipo];
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => onChange({ ...value, tipo })}
              className="rounded-full border px-1.5 py-px text-[11px] font-semibold transition-colors"
              style={
                active
                  ? { background: meta.tint, borderColor: meta.border, color: meta.text }
                  : { background: "transparent", borderColor: "#DCE4F0", color: "#8DA2C0" }
              }
            >
              {meta.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <button type="submit" className="flex-1 rounded-lg bg-brand px-2 py-1 text-[12px] font-semibold text-white hover:bg-brand-dark">
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line px-2 py-1 text-[12px] font-semibold text-ink hover:border-brand"
        >
          Fechar
        </button>
      </div>
    </form>
  );
}

function EditCardDialog({
  card,
  onOpenChange,
  onSave,
  onDelete,
}: {
  card: BoardTarefa | null;
  onOpenChange: (open: boolean) => void;
  onSave: (titulo: string, tipo: TarefaTipo, descricao: string) => void;
  onDelete: () => void;
}) {
  return (
    <Dialog open={!!card} onOpenChange={onOpenChange}>
      <DialogContent className="w-[380px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[380px]">
        {card && (
          <>
            <DialogTitle className="text-[15.5px] font-bold text-ink">Editar card</DialogTitle>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                onSave(
                  String(form.get("titulo") ?? ""),
                  form.get("tipo") as TarefaTipo,
                  String(form.get("descricao") ?? ""),
                );
              }}
              className="mt-3 flex flex-col gap-2.5"
            >
              <div>
                <label className="text-[11.5px] font-semibold text-mut">Título *</label>
                <input
                  name="titulo"
                  required
                  defaultValue={card.titulo}
                  className="mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[11.5px] font-semibold text-mut">Texto / descrição</label>
                <textarea
                  name="descricao"
                  rows={3}
                  defaultValue={card.descricao ?? ""}
                  placeholder="Detalhes da tarefa…"
                  className="mt-1 w-full resize-none rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[11.5px] font-semibold text-mut">Tipo</label>
                <select
                  name="tipo"
                  defaultValue={card.tipo}
                  className="mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand"
                >
                  {TIPO_ORDER.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {TIPO_META[tipo].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-lg border border-danger/40 px-3.5 py-[7px] text-[13px] font-semibold text-danger transition-colors hover:bg-danger/10"
                >
                  Excluir
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-lg border border-line px-3.5 py-[7px] text-[13px] font-semibold text-ink transition-colors hover:border-brand"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
                  >
                    Salvar
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
