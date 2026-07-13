"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";

export function MetaMesCard({
  userId,
  mesIso,
  mesLabel,
  meta,
  recebidoMes,
}: {
  userId: string;
  mesIso: string; // primeiro dia do mês (yyyy-mm-01)
  mesLabel: string;
  meta: number;
  recebidoMes: number;
}) {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(meta ? String(meta) : "");
  const [loading, setLoading] = useState(false);

  const pct = meta > 0 ? Math.min(100, Math.round((recebidoMes / meta) * 100)) : 0;
  const falta = Math.max(0, meta - recebidoMes);
  const bateu = meta > 0 && recebidoMes >= meta;

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const valorNum = Number(valor);
    if (!Number.isFinite(valorNum) || valorNum < 0) return;
    setLoading(true);
    const { error } = await supabase
      .from("metas_financeiras")
      .upsert({ user_id: userId, mes: mesIso, valor_meta: valorNum }, { onConflict: "user_id,mes" });
    setLoading(false);
    if (error) {
      toast("Não foi possível salvar a meta.");
      return;
    }
    setOpen(false);
    toast("✓ Meta do mês atualizada");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-line bg-card px-3.5 py-3">
      <div className="flex items-center gap-2">
        <b className="text-[13.5px] text-ink">Meta financeira · {mesLabel}</b>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="ml-auto rounded-lg border border-line px-2.5 py-[4px] text-[12px] font-semibold text-ink transition-colors hover:border-brand">
              {meta > 0 ? "Editar meta" : "Definir meta"}
            </button>
          </DialogTrigger>
          <DialogContent className="w-[360px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[360px]">
            <DialogTitle className="text-[15.5px] font-bold text-ink">Meta de {mesLabel}</DialogTitle>
            <form onSubmit={salvar} className="mt-3 flex flex-col gap-2.5">
              <div>
                <label className="text-[11.5px] font-semibold text-mut">Valor da meta (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                  className="mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand"
                />
              </div>
              <div className="mt-1 flex justify-end gap-2">
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
                  {loading ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {meta > 0 ? (
        <>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-[18px] font-extrabold tracking-[-0.02em] text-ink">{formatMoney(recebidoMes)}</span>
            <span className="text-[12.5px] text-mut">de {formatMoney(meta)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-line bg-soft-2">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: bateu ? "#0E9F6E" : "#1D5BFF" }}
            />
          </div>
          <div className="mt-1.5 text-[12.5px] font-semibold">
            {bateu ? (
              <span className="text-ok">🎉 Meta batida! {pct}% do objetivo</span>
            ) : (
              <span className="text-mut">
                <b className="text-brand">{pct}%</b> da meta · faltam <b className="text-ink">{formatMoney(falta)}</b>
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="mt-2 text-[13px] text-mut">
          Defina uma meta de faturamento para {mesLabel} e acompanhe o progresso do que já recebeu.
        </div>
      )}
    </div>
  );
}
