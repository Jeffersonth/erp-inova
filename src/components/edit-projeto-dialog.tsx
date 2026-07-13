"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

const field =
  "mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand";
const label = "text-[11.5px] font-semibold text-mut";

export type EditableProjeto = {
  id: string;
  titulo: string;
  clienteId: string | null;
  valor: number | null;
  moeda: Enums<"moeda">;
  dataEntrega: string | null;
};

export function EditProjetoDialog({
  projeto,
  clientes,
  onOpenChange,
  onDeleted,
}: {
  projeto: EditableProjeto | null;
  clientes: { id: string; nome: string }[];
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projeto) return;
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

    const { error: updateError } = await supabase
      .from("projetos")
      .update({
        titulo,
        cliente_id: clienteId || null,
        valor: valor ? Number(valor) : null,
        moeda: form.get("moeda") as Enums<"moeda">,
        data_entrega: dataEntrega || null,
      })
      .eq("id", projeto.id);

    setLoading(false);
    if (updateError) {
      setError("Não foi possível salvar as alterações.");
      return;
    }

    onOpenChange(false);
    toast(`✓ Projeto "${titulo}" atualizado`);
    router.refresh();
  }

  async function excluir() {
    if (!projeto) return;
    if (!confirm(`Excluir o projeto "${projeto.titulo}"? Etapas e cards vinculados também são apagados.`)) {
      return;
    }
    setLoading(true);
    const { error: deleteError } = await supabase.from("projetos").delete().eq("id", projeto.id);
    setLoading(false);
    if (deleteError) {
      setError("Não foi possível excluir o projeto.");
      return;
    }
    onOpenChange(false);
    toast(`✓ Projeto "${projeto.titulo}" excluído`);
    if (onDeleted) onDeleted();
    else router.refresh();
  }

  return (
    <Dialog open={!!projeto} onOpenChange={onOpenChange}>
      <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
        {projeto && (
          <>
            <DialogTitle className="text-[15.5px] font-bold text-ink">Editar projeto</DialogTitle>
            <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
              <div>
                <label className={label}>Título *</label>
                <input name="titulo" required defaultValue={projeto.titulo} className={field} />
              </div>
              <div>
                <label className={label}>Cliente</label>
                <select name="cliente_id" defaultValue={projeto.clienteId ?? ""} className={field}>
                  <option value="">Sem cliente vinculado</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2.5">
                <div>
                  <label className={label}>Valor</label>
                  <input
                    name="valor"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={projeto.valor ?? ""}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label}>Moeda</label>
                  <select name="moeda" defaultValue={projeto.moeda} className={field}>
                    <option value="BRL">R$</option>
                    <option value="USD">US$</option>
                    <option value="EUR">€</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={label}>Entrega prevista</label>
                <input name="data_entrega" type="date" defaultValue={projeto.dataEntrega ?? ""} className={field} />
              </div>

              {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
                  {error}
                </div>
              )}

              <div className="mt-1.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={excluir}
                  disabled={loading}
                  className="rounded-lg border border-danger/40 px-3.5 py-[7px] text-[13px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
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
                    disabled={loading}
                    className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
                  >
                    {loading ? "Salvando…" : "Salvar alterações"}
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
