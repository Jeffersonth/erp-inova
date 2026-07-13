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

const field =
  "mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand";
const label = "text-[11.5px] font-semibold text-mut";

const CATEGORIAS = [
  "Ferramentas & SaaS",
  "Hospedagem & Domínios",
  "Equipamentos",
  "Impostos & Taxas",
  "Marketing",
  "Educação",
  "Outros",
];

export type ClienteOpt = { id: string; nome: string };

export type EditableCusto = {
  id: string;
  descricao: string | null;
  categoria: string | null;
  valor: number;
  data: string;
  recorrente: boolean;
  clienteId: string | null;
};

function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function CustoForm({
  clientes,
  inicial,
  onDone,
}: {
  clientes: ClienteOpt[];
  inicial: EditableCusto | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();

  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [categoria, setCategoria] = useState(inicial?.categoria ?? "");
  const [valor, setValor] = useState(inicial ? String(inicial.valor) : "");
  const [data, setData] = useState(inicial?.data ?? hojeIso());
  const [recorrente, setRecorrente] = useState(inicial?.recorrente ?? false);
  const [clienteId, setClienteId] = useState(inicial?.clienteId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const desc = descricao.trim();
    if (!desc) {
      setError("Informe a descrição da despesa.");
      return;
    }
    const valorNum = Number(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      setError("Informe o valor da despesa.");
      return;
    }

    setLoading(true);
    const payload = {
      descricao: desc,
      categoria: categoria || null,
      valor: valorNum,
      data: data || hojeIso(),
      recorrente,
      cliente_id: clienteId || null,
    };

    if (inicial) {
      const { error: updErr } = await supabase.from("custos").update(payload).eq("id", inicial.id);
      setLoading(false);
      if (updErr) {
        setError("Não foi possível salvar a despesa.");
        return;
      }
      toast("✓ Despesa atualizada");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessão expirada — faça login novamente.");
        setLoading(false);
        return;
      }
      const { error: insErr } = await supabase.from("custos").insert({ ...payload, user_id: user.id });
      setLoading(false);
      if (insErr) {
        setError("Não foi possível registrar a despesa.");
        return;
      }
      toast("✓ Despesa registrada");
    }

    onDone();
    router.refresh();
  }

  async function excluir() {
    if (!inicial) return;
    if (!confirm("Excluir esta despesa? A ação não pode ser desfeita.")) return;
    setLoading(true);
    const { error: delErr } = await supabase.from("custos").delete().eq("id", inicial.id);
    setLoading(false);
    if (delErr) {
      setError("Não foi possível excluir a despesa.");
      return;
    }
    toast("✓ Despesa excluída");
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
      <div>
        <label className={label}>Descrição *</label>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: assinatura do Figma, imposto DAS…"
          className={field}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={label}>Categoria</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={field}>
            <option value="">Sem categoria</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Cliente (opcional)</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={field}>
            <option value="">Custo geral</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={label}>Valor (R$) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className={field}
          />
        </div>
        <div>
          <label className={label}>Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={field} />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-soft px-3 py-2 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={recorrente}
          onChange={(e) => setRecorrente(e.target.checked)}
          className="accent-brand"
        />
        Despesa recorrente (fixa mensal)
      </label>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
          {error}
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {inicial ? (
          <button
            type="button"
            onClick={excluir}
            disabled={loading}
            className="rounded-lg border border-danger/40 px-3.5 py-[7px] text-[13px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
          >
            Excluir
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-line px-3.5 py-[7px] text-[13px] font-semibold text-ink transition-colors hover:border-brand"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Salvando…" : inicial ? "Salvar alterações" : "Registrar despesa"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function NewCustoDialog({ clientes }: { clientes: ClienteOpt[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-lg border border-line px-3 py-[6px] text-[12.5px] font-semibold text-ink transition-colors hover:border-brand">
          + Nova despesa
        </button>
      </DialogTrigger>
      <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
        <DialogTitle className="text-[15.5px] font-bold text-ink">Nova despesa</DialogTitle>
        {open && <CustoForm clientes={clientes} inicial={null} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

export function EditCustoButton({
  custo,
  clientes,
}: {
  custo: EditableCusto;
  clientes: ClienteOpt[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Editar despesa"
          title="Editar"
          className="flex size-6 flex-none items-center justify-center rounded-md text-mut transition-colors hover:bg-soft hover:text-ink"
        >
          ✎
        </button>
      </DialogTrigger>
      <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
        <DialogTitle className="text-[15.5px] font-bold text-ink">Editar despesa</DialogTitle>
        {open && <CustoForm clientes={clientes} inicial={custo} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
