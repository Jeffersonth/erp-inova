"use client";

import { useState } from "react";
import { useApp } from "@/components/app-providers";
import { criarProjetoNota, atualizarProjetoNota, excluirProjetoNota } from "@/lib/actions/projetos";

export type ProjetoNota = { id: string; texto: string; prioridade: boolean };

export function ProjetoNotas({
  projetoId,
  initial,
}: {
  projetoId: string;
  initial: ProjetoNota[];
}) {
  const { toast } = useApp();

  const [notas, setNotas] = useState<ProjetoNota[]>(initial);
  const [texto, setTexto] = useState("");
  const [prioridade, setPrioridade] = useState(false);

  const ordenadas = [...notas].sort((a, b) => Number(b.prioridade) - Number(a.prioridade));

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    const { data, error } = await criarProjetoNota(projetoId, t, prioridade);
    if (error || !data) {
      toast("Não foi possível salvar a anotação.");
      return;
    }
    setNotas((prev) => [data as ProjetoNota, ...prev]);
    setTexto("");
    setPrioridade(false);
  }

  async function togglePrioridade(id: string) {
    const nota = notas.find((n) => n.id === id);
    if (!nota) return;
    const nova = !nota.prioridade;
    setNotas((prev) => prev.map((n) => (n.id === id ? { ...n, prioridade: nova } : n)));
    await atualizarProjetoNota(id, nova);
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta anotação?")) return;
    setNotas((prev) => prev.filter((n) => n.id !== id));
    await excluirProjetoNota(id);
  }

  return (
    <div className="rounded-xl border border-line bg-card px-3.5 py-3">
      <div className="mb-2 flex items-center gap-2">
        <b className="text-[13.5px] text-ink">Anotações importantes</b>
        <span className="text-[12px] text-mut">lembretes do projeto · prioridade sobe pro topo</span>
      </div>

      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          placeholder="Ex: cliente pediu tom mais formal na home…"
          className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand"
        />
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[12.5px] text-mut">
            <input type="checkbox" checked={prioridade} onChange={(e) => setPrioridade(e.target.checked)} className="accent-amber-500" />
            ★ prioridade
          </label>
          <button
            type="submit"
            className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            + Anotar
          </button>
        </div>
      </form>

      {ordenadas.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {ordenadas.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                n.prioridade ? "border-warn/40 bg-warn/[0.06]" : "border-line bg-soft"
              }`}
            >
              <button
                type="button"
                onClick={() => togglePrioridade(n.id)}
                aria-label={n.prioridade ? "Remover prioridade" : "Marcar como prioridade"}
                title={n.prioridade ? "Remover prioridade" : "Marcar como prioridade"}
                className={`flex-none text-[15px] leading-none transition-colors ${
                  n.prioridade ? "text-warn" : "text-mut hover:text-warn"
                }`}
              >
                {n.prioridade ? "★" : "☆"}
              </button>
              <span className="min-w-0 flex-1 whitespace-pre-wrap text-[13.5px] leading-snug text-ink">{n.texto}</span>
              <button
                type="button"
                onClick={() => excluir(n.id)}
                aria-label="Excluir anotação"
                title="Excluir"
                className="flex-none text-mut transition-colors hover:text-danger"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
