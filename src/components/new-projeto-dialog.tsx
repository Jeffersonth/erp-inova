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

export function NewProjetoDialog({
  clientes,
}: {
  clientes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada — faça login novamente.");
      setLoading(false);
      return;
    }

    const clienteId = String(form.get("cliente_id") ?? "");
    const valor = String(form.get("valor") ?? "").trim();
    const dataEntrega = String(form.get("data_entrega") ?? "").trim();

    const { error: insertError } = await supabase.from("projetos").insert({
      user_id: user.id,
      titulo,
      cliente_id: clienteId || null,
      valor: valor ? Number(valor) : null,
      moeda: form.get("moeda") as Enums<"moeda">,
      status: form.get("status") as Enums<"projeto_status">,
      data_entrega: dataEntrega || null,
      progresso: 0,
    });

    setLoading(false);
    if (insertError) {
      setError("Não foi possível salvar o projeto.");
      return;
    }

    setOpen(false);
    toast(`✓ Projeto "${titulo}" criado`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="ml-auto rounded-lg bg-brand px-3.5 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark">
          + Novo projeto
        </button>
      </DialogTrigger>
      <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
        <DialogTitle className="text-[14.5px] font-bold text-ink">Novo projeto</DialogTitle>
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
          <div className="grid grid-cols-[1fr_auto] gap-2.5">
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
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>Entrega prevista</label>
              <input name="data_entrega" type="date" className={field} />
            </div>
            <div>
              <label className={label}>Etapa inicial</label>
              <select name="status" defaultValue="briefing" className={field}>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] text-danger">
              {error}
            </div>
          )}

          <div className="mt-1.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-line px-3.5 py-[7px] text-xs font-semibold text-ink transition-colors hover:border-brand"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? "Salvando…" : "Salvar projeto"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
