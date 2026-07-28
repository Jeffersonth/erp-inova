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
import { ArquivosBox } from "@/components/arquivos-box";
import { atualizarCliente, excluirCliente } from "@/lib/actions/clientes";
import type { Enums } from "@/lib/supabase/database.types";

const field =
  "mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand";
const label = "text-[11.5px] font-semibold text-mut";

const statusOptions: { value: Enums<"cliente_status">; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "qualificado", label: "Qualificado" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "cliente", label: "Cliente" },
  { value: "recorrente", label: "Recorrente" },
  { value: "frio", label: "Lead frio" },
  { value: "perdido", label: "Perdido" },
];

const paisOptions = [
  { value: "BR", label: "🇧🇷 Brasil" },
  { value: "US", label: "🇺🇸 Estados Unidos" },
  { value: "PT", label: "🇵🇹 Portugal" },
  { value: "DE", label: "🇩🇪 Alemanha" },
  { value: "NO", label: "🇳🇴 Noruega" },
  { value: "ES", label: "🇪🇸 Espanha" },
];

export type EditableCliente = {
  id: string;
  nome: string;
  contato_nome: string | null;
  email: string | null;
  telefone: string | null;
  pais: string;
  ramo: string | null;
  status: Enums<"cliente_status">;
};

export function EditClienteDialog({ cliente }: { cliente: EditableCliente }) {
  const router = useRouter();
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const nome = String(form.get("nome") ?? "").trim();
    if (!nome) {
      setError("Informe o nome do contato.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await atualizarCliente(cliente.id, {
      nome,
      contato_nome: String(form.get("contato_nome") ?? "") || null,
      email: String(form.get("email") ?? "") || null,
      telefone: String(form.get("telefone") ?? "") || null,
      pais: String(form.get("pais") ?? "BR"),
      ramo: String(form.get("ramo") ?? "") || null,
      status: form.get("status") as Enums<"cliente_status">,
    });

    setLoading(false);
    if (updateError) {
      setError(updateError);
      return;
    }

    setOpen(false);
    toast(`✓ ${nome} atualizado`);
    router.refresh();
  }

  async function excluir() {
    if (!confirm(`Excluir "${cliente.nome}" do CRM? Projetos e recebimentos vinculados ficam sem cliente, mas não são apagados.`)) {
      return;
    }
    setLoading(true);
    const { error: deleteError } = await excluirCliente(cliente.id);
    setLoading(false);
    if (deleteError) {
      setError(deleteError);
      return;
    }
    setOpen(false);
    toast(`✓ ${cliente.nome} excluído`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label={`Editar ${cliente.nome}`}
          title="Editar"
          className="flex size-6 flex-none items-center justify-center rounded-md text-mut transition-colors hover:bg-soft hover:text-ink"
        >
          ✎
        </button>
      </DialogTrigger>
      <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
        <DialogTitle className="text-[15.5px] font-bold text-ink">Editar contato</DialogTitle>
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
          <div>
            <label className={label}>Nome / empresa *</label>
            <input name="nome" required defaultValue={cliente.nome} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>Pessoa de contato</label>
              <input name="contato_nome" defaultValue={cliente.contato_nome ?? ""} className={field} />
            </div>
            <div>
              <label className={label}>Ramo</label>
              <input name="ramo" defaultValue={cliente.ramo ?? ""} className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>E-mail</label>
              <input name="email" type="email" defaultValue={cliente.email ?? ""} className={field} />
            </div>
            <div>
              <label className={label}>Telefone</label>
              <input name="telefone" defaultValue={cliente.telefone ?? ""} className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>País</label>
              <select name="pais" defaultValue={cliente.pais} className={field}>
                {paisOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Status</label>
              <select name="status" defaultValue={cliente.status} className={field}>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
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
                {loading ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-3 border-t border-line pt-3">
          <ArquivosBox
            scope="cliente"
            ownerId={cliente.id}
            accept="application/pdf"
            titulo="Notas fiscais (PDF)"
            ajuda="Anexe as NFs deste cliente em PDF (máx. 15 MB)."
            classificacaoPadrao="Nota fiscal"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
