"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useApp } from "@/components/app-providers";
import { criarProjeto } from "@/lib/actions/projetos";
import type { Enums } from "@/lib/supabase/database.types";
import { TIPO_META, TIPO_ORDER, type TarefaTipo } from "@/lib/tarefa-tipos";

const field =
  "mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand";
const label = "text-[11.5px] font-semibold text-mut";


type CardDraft = { titulo: string; tipo: TarefaTipo };

export function NewProjetoDialog({
  clientes,
}: {
  clientes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cards, setCards] = useState<CardDraft[]>([]);
  const [cardTitulo, setCardTitulo] = useState("");
  const [cardTipo, setCardTipo] = useState<TarefaTipo>("dev");

  function resetCards() {
    setCards([]);
    setCardTitulo("");
    setCardTipo("dev");
  }

  function addCard() {
    const t = cardTitulo.trim();
    if (!t) return;
    setCards((prev) => [...prev, { titulo: t, tipo: cardTipo }]);
    setCardTitulo("");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const titulo = String(form.get("titulo") ?? "").trim();
    if (!titulo) {
      setError("Informe o título do projeto.");
      setLoading(false);
      return;
    }

    const clienteId = String(form.get("cliente_id") ?? "");
    const valor = String(form.get("valor") ?? "").trim();
    const dataEntrega = String(form.get("data_entrega") ?? "").trim();

    const { error: insertError, projetoId } = await criarProjeto({
      titulo,
      cliente_id: clienteId || null,
      valor: valor ? Number(valor) : null,
      moeda: form.get("moeda") as Enums<"moeda">,
      data_entrega: dataEntrega || null,
      cards,
    });

    setLoading(false);
    if (insertError || !projetoId) {
      setError(insertError ?? "Não foi possível salvar o projeto.");
      return;
    }

    setOpen(false);
    resetCards();
    toast(`✓ Projeto "${titulo}" criado`);
    router.push(`/projetos?p=${projetoId}`);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetCards();
      }}
    >
      <DialogTrigger asChild>
        <button className="ml-auto rounded-lg bg-brand px-3.5 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark">
          + Novo projeto
        </button>
      </DialogTrigger>
      <DialogContent className="w-[460px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[460px]">
        <DialogTitle className="text-[15.5px] font-bold text-ink">Novo projeto</DialogTitle>
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
          <div>
            <label className={label}>Título *</label>
            <input name="titulo" required className={field} placeholder="Título do projeto" />
          </div>
          <div>
            <label className={label}>Cliente</label>
            <select name="cliente_id" defaultValue="" className={field}>
              <option value="">Sem cliente vinculado</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5">
            <div>
              <label className={label}>Valor</label>
              <input name="valor" type="number" min="0" step="0.01" className={field} placeholder="0,00" />
            </div>
            <div>
              <label className={label}>Moeda</label>
              <select name="moeda" defaultValue="BRL" className={field}>
                <option value="BRL">R$</option>
                <option value="USD">US$</option>
                <option value="EUR">€</option>
              </select>
            </div>
            <div>
              <label className={label}>Entrega</label>
              <input name="data_entrega" type="date" className={field} />
            </div>
          </div>

          {/* Cards iniciais (opcional) */}
          <div className="rounded-lg border border-line bg-soft px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className={label}>Cards iniciais (opcional)</span>
              <span className="text-[11.5px] text-mut">entram na etapa &ldquo;Captação de Informações&rdquo;</span>
            </div>

            {cards.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {cards.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-line bg-card px-2 py-1">
                    <span
                      className="rounded-full px-1.5 py-px text-[11px] font-semibold"
                      style={{ background: TIPO_META[c.tipo].tint, color: TIPO_META[c.tipo].text }}
                    >
                      {TIPO_META[c.tipo].label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{c.titulo}</span>
                    <button
                      type="button"
                      onClick={() => setCards((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="Remover card"
                      className="text-mut transition-colors hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1">
              {TIPO_ORDER.map((tipo) => {
                const active = cardTipo === tipo;
                const meta = TIPO_META[tipo];
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setCardTipo(tipo)}
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
            <div className="mt-1.5 flex gap-1.5">
              <input
                value={cardTitulo}
                onChange={(e) => setCardTitulo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCard();
                  }
                }}
                placeholder="Título do card"
                className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={addCard}
                className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-brand"
              >
                + Add
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
              {error}
            </div>
          )}

          <div className="mt-1.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-line px-3.5 py-[7px] text-[13px] font-semibold text-ink transition-colors hover:border-brand"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? "Criando…" : "Criar projeto"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
