import Link from "next/link";
import { AGENDA_TIPOS, agendaMoney, type AgendaItem } from "@/lib/agenda-items";

export function AgendaItemList({ items, onEdit, onPago, busy = false }: {
  items: AgendaItem[]; onEdit?: (item: AgendaItem) => void;
  onPago?: (item: AgendaItem, pago: boolean) => void; busy?: boolean;
}) {
  return <div className="space-y-2">{items.map(item => {
    const meta = AGENDA_TIPOS[item.tipo];
    const label = item.concluido ? item.tipo === "pagamento" ? "Pago" : "Recebido" : meta.label;
    const href = item.origem === "recebimento" ? "/financeiro" : item.origem === "tarefa" ? "/tarefas" : `/agenda?dia=${item.data}&item=${item.sourceId}`;
    return <article key={item.id} className="flex items-start gap-3 rounded-lg border border-line bg-card p-3">
      {item.tipo === "pagamento" && onPago && <input type="checkbox" aria-label={`Pago: ${item.titulo}`} className="mt-1 size-4 shrink-0 accent-brand" disabled={busy} checked={item.concluido} onChange={e => onPago(item, e.target.checked)} />}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: meta.cor, background: meta.tint }}>{label}</span><span className="text-xs tabular-nums text-mut">{item.horario}</span></div>
        {onEdit && item.origem === "evento" ? <button disabled={busy} onClick={() => onEdit(item)} className={`text-left text-sm font-semibold hover:text-brand ${item.concluido ? "text-mut line-through" : "text-ink"}`}>{item.titulo}</button> : <Link className={`block text-sm font-semibold hover:text-brand ${item.concluido ? "text-mut line-through" : "text-ink"}`} href={href}>{item.titulo}</Link>}
        {item.detalhe && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-mut">{item.detalhe}</p>}
        {item.origem === "recebimento" && <Link href="/financeiro" className="mt-1 inline-block text-xs font-semibold text-brand">Ver no Financeiro →</Link>}
      </div>
      {item.valor !== null && <span className={`shrink-0 text-sm font-bold ${item.concluido ? "text-mut" : item.tipo === "recebimento" ? "text-ok" : "text-ink"}`}>{agendaMoney(item.valor, item.moeda)}</span>}
    </article>;
  })}</div>;
}
