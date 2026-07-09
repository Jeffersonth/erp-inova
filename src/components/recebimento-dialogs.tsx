"use client";

import { useMemo, useState } from "react";
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

export type ClienteOpt = { id: string; nome: string };
export type ProjetoOpt = { id: string; titulo: string; cliente_id: string | null };

export type EditableRecebimento = {
  id: string;
  clienteId: string | null;
  projetoId: string | null;
  descricao: string | null;
  valor: number;
  valorPago: number;
  moeda: Enums<"moeda">;
  dataPagamento: string | null;
};

function statusFor(valor: number, pago: number): Enums<"recebimento_status"> {
  if (pago >= valor && valor > 0) return "pago";
  if (pago > 0) return "parcial";
  return "em_dia";
}

function VendaForm({
  clientes,
  projetos,
  inicial,
  onDone,
}: {
  clientes: ClienteOpt[];
  projetos: ProjetoOpt[];
  inicial: EditableRecebimento | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();

  const [clienteId, setClienteId] = useState(inicial?.clienteId ?? "");
  const [projetoId, setProjetoId] = useState(inicial?.projetoId ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [moeda, setMoeda] = useState<Enums<"moeda">>(inicial?.moeda ?? "BRL");
  const [valor, setValor] = useState(inicial ? String(inicial.valor) : "");
  const [tipo, setTipo] = useState<"total" | "parcial">(
    inicial && inicial.valorPago < inicial.valor ? "parcial" : "total",
  );
  const [valorPago, setValorPago] = useState(inicial ? String(inicial.valorPago) : "");
  const [dataPagamento, setDataPagamento] = useState(inicial?.dataPagamento ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projetosFiltrados = useMemo(
    () => projetos.filter((p) => !clienteId || p.cliente_id === clienteId),
    [projetos, clienteId],
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const valorNum = Number(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      setError("Informe o valor do serviço.");
      return;
    }
    const pago =
      tipo === "total" ? valorNum : Math.min(valorNum, Math.max(0, Number(valorPago) || 0));

    setLoading(true);
    const payload = {
      cliente_id: clienteId || null,
      projeto_id: projetoId || null,
      descricao: descricao.trim() || null,
      valor: valorNum,
      valor_pago: pago,
      moeda,
      data_pagamento: dataPagamento || null,
      status: statusFor(valorNum, pago),
    };

    if (inicial) {
      const { error: updErr } = await supabase.from("recebimentos").update(payload).eq("id", inicial.id);
      setLoading(false);
      if (updErr) {
        setError("Não foi possível salvar a venda.");
        return;
      }
      toast("✓ Venda atualizada");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessão expirada — faça login novamente.");
        setLoading(false);
        return;
      }
      const { error: insErr } = await supabase.from("recebimentos").insert({ ...payload, user_id: user.id });
      setLoading(false);
      if (insErr) {
        setError("Não foi possível registrar a venda.");
        return;
      }
      toast("✓ Venda registrada");
    }

    onDone();
    router.refresh();
  }

  async function excluir() {
    if (!inicial) return;
    if (!confirm("Excluir esta venda? A ação não pode ser desfeita.")) return;
    setLoading(true);
    const { error: delErr } = await supabase.from("recebimentos").delete().eq("id", inicial.id);
    setLoading(false);
    if (delErr) {
      setError("Não foi possível excluir a venda.");
      return;
    }
    toast("✓ Venda excluída");
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={label}>Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value);
              setProjetoId("");
            }}
            className={field}
          >
            <option value="">Sem cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Projeto</label>
          <select value={projetoId} onChange={(e) => setProjetoId(e.target.value)} className={field}>
            <option value="">Sem projeto</option>
            {projetosFiltrados.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Descrição (opcional)</label>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: fatura #001, entrada do site…"
          className={field}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2.5">
        <div>
          <label className={label}>Valor do serviço *</label>
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
          <label className={label}>Moeda</label>
          <select value={moeda} onChange={(e) => setMoeda(e.target.value as Enums<"moeda">)} className={field}>
            <option value="BRL">R$</option>
            <option value="USD">US$</option>
            <option value="EUR">€</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Pagamento</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(["total", "parcial"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ${
                tipo === t ? "border-brand bg-brand/[0.06] text-brand" : "border-line bg-soft text-mut hover:border-brand"
              }`}
            >
              {t === "total" ? "Pagamento total" : "Pagamento parcial"}
            </button>
          ))}
        </div>
      </div>

      {tipo === "parcial" && (
        <div>
          <label className={label}>Valor pago</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={valorPago}
            onChange={(e) => setValorPago(e.target.value)}
            placeholder="quanto já foi pago"
            className={field}
          />
          {valor && valorPago && Number(valor) > Number(valorPago) && (
            <div className="mt-1 text-[11px] text-mut">
              Saldo em aberto:{" "}
              <b className="text-warn">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(
                  Math.max(0, Number(valor) - Number(valorPago)),
                )}
              </b>
            </div>
          )}
        </div>
      )}

      <div>
        <label className={label}>Data do pagamento</label>
        <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} className={field} />
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] text-danger">
          {error}
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {inicial ? (
          <button
            type="button"
            onClick={excluir}
            disabled={loading}
            className="rounded-lg border border-danger/40 px-3.5 py-[7px] text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
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
            className="rounded-lg border border-line px-3.5 py-[7px] text-xs font-semibold text-ink transition-colors hover:border-brand"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand px-4 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Salvando…" : inicial ? "Salvar alterações" : "Registrar venda"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function NewRecebimentoDialog({
  clientes,
  projetos,
}: {
  clientes: ClienteOpt[];
  projetos: ProjetoOpt[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="ml-auto rounded-lg bg-brand px-3.5 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark">
          + Nova venda
        </button>
      </DialogTrigger>
      <DialogContent className="w-[460px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[460px]">
        <DialogTitle className="text-[14.5px] font-bold text-ink">Nova venda</DialogTitle>
        {open && (
          <VendaForm clientes={clientes} projetos={projetos} inicial={null} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditRecebimentoButton({
  recebimento,
  clientes,
  projetos,
}: {
  recebimento: EditableRecebimento;
  clientes: ClienteOpt[];
  projetos: ProjetoOpt[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Editar venda"
          title="Editar"
          className="flex size-6 flex-none items-center justify-center rounded-md text-mut transition-colors hover:bg-soft hover:text-ink"
        >
          ✎
        </button>
      </DialogTrigger>
      <DialogContent className="w-[460px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[460px]">
        <DialogTitle className="text-[14.5px] font-bold text-ink">Editar venda</DialogTitle>
        {open && (
          <VendaForm clientes={clientes} projetos={projetos} inicial={recebimento} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
