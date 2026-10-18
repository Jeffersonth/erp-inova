"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/components/app-providers";
import {
  criarTarefaDia,
  atualizarTarefaDia,
  reordenarTarefasDia,
  excluirTarefaDia,
} from "@/lib/actions/tarefas-dia";
import { diffDays, relativeDate } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

export type DayTask = {
  id: string;
  titulo: string;
  descricao: string;
  status: Enums<"tarefa_dia_status">;
  data_finalizar: string | null;
  ordem: number;
};

const field =
  "rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand";

function prazoInfo(data: string | null, concluida: boolean) {
  if (!data) return { label: "sem prazo", cls: "text-mut" };
  if (concluida) return { label: relativeDate(data), cls: "text-mut" };
  const d = diffDays(data);
  if (d < 0)
    return {
      label: `atrasada · ${relativeDate(data)}`,
      cls: "text-danger font-semibold",
    };
  if (d === 0) return { label: "termina hoje", cls: "text-warn font-semibold" };
  return { label: `até ${relativeDate(data)}`, cls: "text-mut" };
}

export function DayTasks({ initialTasks }: { initialTasks: DayTask[] }) {
  const { toast } = useApp();

  const [tasks, setTasks] = useState<DayTask[]>(initialTasks);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [editing, setEditing] = useState<DayTask | null>(null);
  const dragId = useRef<string | null>(null);

  const ativas = tasks
    .filter((t) => t.status !== "concluida")
    .sort((a, b) => a.ordem - b.ordem);
  const concluidas = tasks.filter((t) => t.status === "concluida");

  async function persistOrdem(lista: DayTask[]) {
    await reordenarTarefasDia(lista.map((t, i) => ({ id: t.id, ordem: i })));
  }

  async function addTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const titulo = novoTitulo.trim();
    if (!titulo || adding) return;
    const ordem = ativas.length;
    setAdding(true);
    const { data, error } = await criarTarefaDia({
      titulo,
      descricao: novaDescricao,
      data_finalizar: novaData || null,
      ordem,
    });
    setAdding(false);
    if (error || !data) {
      toast("Não foi possível adicionar a tarefa");
      return;
    }
    setTasks((prev) => [...prev, data as DayTask]);
    setNovoTitulo("");
    setNovaData("");
    setNovaDescricao("");
  }

  async function setStatus(id: string, status: Enums<"tarefa_dia_status">) {
    const concluindo = status === "concluida";
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const previous = tasks.find((t) => t.id === id);
    const { error } = await atualizarTarefaDia(id, {
      status,
      concluida_em: concluindo ? new Date().toISOString() : null,
    });
    if (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id && previous ? { ...t, status: previous.status } : t,
        ),
      );
      toast(error);
    }
  }

  function onDropOn(targetId: string) {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === targetId) return;
    const lista = [...ativas];
    const fromIdx = lista.findIndex((t) => t.id === from);
    const toIdx = lista.findIndex((t) => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = lista.splice(fromIdx, 1);
    lista.splice(toIdx, 0, moved);
    const reordenadas = lista.map((t, i) => ({ ...t, ordem: i }));
    setTasks([...reordenadas, ...concluidas]);
    persistOrdem(reordenadas);
  }

  async function saveEdit(titulo: string, descricao: string, data: string) {
    if (!editing || saving) return;
    const title = titulo.trim();
    if (!title) return;
    setSaving(true);
    const { error } = await atualizarTarefaDia(editing.id, {
      titulo: title,
      descricao,
      data_finalizar: data || null,
    });
    setSaving(false);
    if (error) {
      toast(error);
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editing.id
          ? {
              ...t,
              titulo: title,
              descricao: descricao.trim(),
              data_finalizar: data || null,
            }
          : t,
      ),
    );
    setEditing(null);
  }

  async function deleteTask() {
    if (!editing || saving) return;
    if (!confirm(`Excluir a tarefa "${editing.titulo}"?`)) return;
    setSaving(true);
    const { error } = await excluirTarefaDia(editing.id);
    setSaving(false);
    if (error) {
      toast(error);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== editing.id));
    setEditing(null);
  }

  function TaskRow({ t, draggable }: { t: DayTask; draggable: boolean }) {
    const concluida = t.status === "concluida";
    const emAndamento = t.status === "em_andamento";
    const prazo = prazoInfo(t.data_finalizar, concluida);
    return (
      <div
        draggable={draggable}
        onDragStart={() => (dragId.current = t.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onDropOn(t.id)}
        data-task-id={t.id}
        className={`flex items-start gap-2.5 rounded-xl border px-3 py-3 transition-colors ${
          concluida
            ? "border-line bg-soft opacity-70"
            : emAndamento
              ? "border-brand/40 bg-brand/[0.04]"
              : "border-line bg-card hover:border-brand/50"
        } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        {draggable && (
          <span
            className="mt-1 select-none text-[14px] leading-none text-mut"
            title="Arraste para reordenar"
          >
            ⠿
          </span>
        )}
        <button
          type="button"
          onClick={() => setStatus(t.id, concluida ? "pendente" : "concluida")}
          aria-label={concluida ? "Reabrir tarefa" : "Concluir tarefa"}
          title={concluida ? "Reabrir" : "Concluir"}
          className="mt-0.5 flex size-[18px] flex-none items-center justify-center rounded-full border text-[12px] leading-none transition-colors"
          style={
            concluida
              ? { background: "#0E9F6E", borderColor: "#0E9F6E", color: "#fff" }
              : { borderColor: "#B7C4DA", color: "transparent" }
          }
        >
          ✓
        </button>

        <div className="min-w-0 flex-1">
          <h2
            className={`break-words text-[14px] font-bold leading-snug ${concluida ? "text-mut line-through" : "text-ink"}`}
          >
            {t.titulo}
          </h2>
          {t.descricao && (
            <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-mut">
              {t.descricao}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            {!concluida && (
              <button
                type="button"
                onClick={() =>
                  setStatus(t.id, emAndamento ? "pendente" : "em_andamento")
                }
                className={`rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${emAndamento ? "border-brand/40 bg-brand/[0.08] text-brand" : "border-line bg-soft text-mut hover:border-brand hover:text-brand"}`}
              >
                {emAndamento ? "● em andamento" : "▶ iniciar"}
              </button>
            )}
            <span className={`text-[12px] ${prazo.cls}`}>{prazo.label}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing(t)}
          aria-label={`Editar ${t.titulo}`}
          title="Editar"
          className="flex size-6 flex-none items-center justify-center rounded-md text-mut transition-colors hover:bg-soft-2 hover:text-ink"
        >
          ✎
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Adicionar tarefa */}
      <form onSubmit={addTask} className="erp-card flex flex-col gap-3 p-4">
        <div>
          <label
            htmlFor="nova-tarefa-titulo"
            className="text-xs font-semibold text-ink"
          >
            Título da tarefa
          </label>
          <input
            id="nova-tarefa-titulo"
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            required
            placeholder="O que você precisa fazer?"
            className={`mt-1 w-full ${field}`}
          />
        </div>
        <div>
          <label
            htmlFor="nova-tarefa-descricao"
            className="text-xs font-semibold text-ink"
          >
            Pequeno texto{" "}
            <span className="font-normal text-mut">(opcional)</span>
          </label>
          <textarea
            id="nova-tarefa-descricao"
            value={novaDescricao}
            onChange={(e) => setNovaDescricao(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Descreva o que fazer ou o resultado esperado…"
            className={`mt-1 w-full resize-y ${field}`}
          />
          <p className="text-right text-[11px] text-mut">
            {novaDescricao.length}/500
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label
              htmlFor="nova-tarefa-data"
              className="mb-1 block text-xs font-semibold text-mut"
            >
              Finalizar até
            </label>
            <input
              id="nova-tarefa-data"
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              className={field}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {adding ? "Adicionando…" : "+ Adicionar tarefa"}
          </button>
        </div>
      </form>

      {/* Ativas */}
      <div className="flex flex-col gap-1.5">
        {ativas.length === 0 && concluidas.length === 0 && (
          <div className="erp-card px-3.5 py-10 text-center">
            <div className="text-[14px] font-semibold text-ink">
              Nenhuma tarefa ainda
            </div>
            <div className="mt-1 text-[13px] text-mut">
              Adicione a primeira tarefa do seu dia acima.
            </div>
          </div>
        )}
        {ativas.map((t) => (
          <TaskRow key={t.id} t={t} draggable />
        ))}
      </div>

      {/* Concluídas — separadas, no fim */}
      {concluidas.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-mut">
              Concluídas
            </span>
            <span className="rounded-full border border-line bg-card px-1.5 text-[10.5px] text-mut">
              {concluidas.length}
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>
          {concluidas.map((t) => (
            <TaskRow key={t.id} t={t} draggable={false} />
          ))}
        </div>
      )}

      {/* Dialog de edição */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="w-[400px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[400px]">
          {editing && (
            <>
              <DialogTitle className="text-[15.5px] font-bold text-ink">
                Editar tarefa
              </DialogTitle>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  saveEdit(
                    String(form.get("titulo") ?? ""),
                    String(form.get("descricao") ?? ""),
                    String(form.get("data") ?? ""),
                  );
                }}
                className="mt-3 flex flex-col gap-2.5"
              >
                <div>
                  <label className="text-[11.5px] font-semibold text-mut">
                    Título *
                  </label>
                  <input
                    aria-label="Título"
                    name="titulo"
                    required
                    defaultValue={editing.titulo}
                    className={`mt-1 w-full ${field}`}
                  />
                </div>
                <div>
                  <label
                    htmlFor="editar-tarefa-descricao"
                    className="text-[11.5px] font-semibold text-mut"
                  >
                    Pequeno texto (opcional)
                  </label>
                  <textarea
                    id="editar-tarefa-descricao"
                    name="descricao"
                    defaultValue={editing.descricao ?? ""}
                    maxLength={500}
                    rows={3}
                    className={`mt-1 w-full resize-y ${field}`}
                  />
                </div>
                <div>
                  <label className="text-[11.5px] font-semibold text-mut">
                    Finalizar até
                  </label>
                  <input
                    name="data"
                    aria-label="Finalizar até"
                    type="date"
                    defaultValue={editing.data_finalizar ?? ""}
                    className={`mt-1 w-full ${field}`}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={deleteTask}
                    disabled={saving}
                    className="rounded-lg border border-danger/40 px-3.5 py-[7px] text-[13px] font-semibold text-danger transition-colors hover:bg-danger/10"
                  >
                    Excluir
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-lg border border-line px-3.5 py-[7px] text-[13px] font-semibold text-ink transition-colors hover:border-brand"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
                    >
                      {saving ? "Salvando…" : "Salvar"}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
