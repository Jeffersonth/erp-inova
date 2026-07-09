"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

const field =
  "mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand";
const label = "text-[10.5px] font-semibold text-mut";

const statusOptions: { value: Enums<"projeto_status">; label: string }[] = [
  { value: "briefing", label: "Briefing" },
  { value: "proposta", label: "Proposta" },
  { value: "aprovado", label: "Aprovado" },
  { value: "dev", label: "Em dev" },
  { value: "revisao", label: "Revisão" },
  { value: "entrega", label: "Entrega" },
  { value: "concluido", label: "Concluído" },
];

export type EditableProjeto = {
  id: string;
  titulo: string;
  clienteId: string | null;
  valor: number | null;
  moeda: Enums<"moeda">;
  dataEntrega: string | null;
  status: Enums<"projeto_status">;
  progresso: number;
};

export function EditProjetoDialog({
  projeto,
  clientes,
  onOpenChange,
}: {
  projeto: EditableProjeto | null;
  clientes: { id: string; nome: string }[];
  onOpenChange: (open: boolean) => void;
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
    const progresso = Number(form.get("progresso") ?? 0);

    const { error: updateError } = await supabase
      .from("projetos")
      .update({
        titulo,
        cliente_id: clienteId || null,
        valor: valor ? Number(valor) : null,
        moeda: form.get("moeda") as Enums<"moeda">,
        status: form.get("status") as Enums<"projeto_status">,
        data_entrega: dataEntrega || null,
        progresso: Number.isFinite(progresso) ? Math.min(100, Math.max(0, progresso)) : 0,
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
    if (!confirm(`Excluir o projeto "${projeto.titulo}"? Etapas e checklist vinculados também são apagados.`)) {
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
    router.refresh();
  }

  return (
    <Dialog open={!!projeto} onOpenChange={onOpenChange}>
      <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
        {projeto && (
          <>
            <DialogTitle className="text-[14.5px] font-bold text-ink">Editar projeto</DialogTitle>
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
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={label}>Entrega prevista</label>
                  <input name="data_entrega" type="date" defaultValue={projeto.dataEntrega ?? ""} className={field} />
                </div>
                <div>
                  <label className={label}>Etapa</label>
                  <select name="status" defaultValue={projeto.status} className={field}>
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={label}>Progresso ({projeto.progresso}%)</label>
                <input
                  name="progresso"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  defaultValue={projeto.progresso}
                  className="mt-1 w-full accent-brand"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] text-danger">
                  {error}
                </div>
              )}

              <div className="mt-1.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={excluir}
                  disabled={loading}
                  className="rounded-lg border border-danger/40 px-3.5 py-[7px] text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
                >
                  Excluir
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-lg border border-line px-3.5 py-[7px] text-xs font-semibold text-ink transition-colors hover:border-brand"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-brand px-4 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
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
