"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AgendaItemList } from "@/components/agenda-item-list";
import { marcarPagamentoAgenda } from "@/lib/actions/agenda";
import type { AgendaItem } from "@/lib/agenda-items";

export function AgendaHoje({ items, error }: { items: AgendaItem[]; error: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function paid(item: AgendaItem, pago: boolean) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await marcarPagamentoAgenda(item.sourceId, pago);
      if (result.error) setMessage(result.error); else { setMessage(pago ? "Pagamento marcado como pago." : "Pagamento marcado como pendente."); router.refresh(); }
    } catch { setMessage("Não foi possível atualizar o pagamento. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <section className="erp-card erp-card--peach p-3.5" aria-label="Agenda de hoje">
    <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-sm font-bold text-ink">Agenda de hoje</h2><p className="mt-1 text-xs text-mut">Datas importantes, compromissos e pagamentos do dia.</p></div><Link href="/agenda" className="shrink-0 text-xs font-semibold text-brand">Ver agenda →</Link></div>
    {error ? <p role="alert" className="text-sm text-danger">Não foi possível carregar todos os itens. Atualize a página para tentar novamente.</p> : items.length ? <AgendaItemList items={items} onPago={paid} busy={busy} /> : <p className="py-3 text-sm text-mut">Nenhuma data ou pagamento para hoje.</p>}
    {message && <p role="status" className="mt-2 text-xs text-mut">{message}</p>}
  </section>;
}
