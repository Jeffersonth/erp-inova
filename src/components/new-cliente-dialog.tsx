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

export function NewClienteDialog() {
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
    const nome = String(form.get("nome") ?? "").trim();
    if (!nome) {
      setError("Informe o nome do contato.");
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

    const { error: insertError } = await supabase.from("clientes").insert({
      user_id: user.id,
      nome,
      contato_nome: String(form.get("contato_nome") ?? "") || null,
      email: String(form.get("email") ?? "") || null,
      telefone: String(form.get("telefone") ?? "") || null,
      pais: String(form.get("pais") ?? "BR"),
      ramo: String(form.get("ramo") ?? "") || null,
      status: form.get("status") as Enums<"cliente_status">,
    });

    setLoading(false);
    if (insertError) {
      setError("Não foi possível salvar o contato.");
      return;
    }

    setOpen(false);
    toast(`✓ ${nome} adicionado ao CRM`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="ml-auto rounded-lg bg-brand px-3.5 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark">
          + Novo contato
        </button>
      </DialogTrigger>
      <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
        <DialogTitle className="text-[14.5px] font-bold text-ink">Novo contato</DialogTitle>
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
          <div>
            <label className={label}>Nome / empresa *</label>
            <input name="nome" required className={field} placeholder="Nome do cliente ou empresa" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>Pessoa de contato</label>
              <input name="contato_nome" className={field} placeholder="Ex: João Prado" />
            </div>
            <div>
              <label className={label}>Ramo</label>
              <input name="ramo" className={field} placeholder="Ex: E-commerce" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>E-mail</label>
              <input name="email" type="email" className={field} placeholder="contato@empresa.com" />
            </div>
            <div>
              <label className={label}>Telefone</label>
              <input name="telefone" className={field} placeholder="+55 11 90000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>País</label>
              <select name="pais" defaultValue="BR" className={field}>
                {paisOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Status</label>
              <select name="status" defaultValue="lead" className={field}>
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
              {loading ? "Salvando…" : "Salvar contato"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
