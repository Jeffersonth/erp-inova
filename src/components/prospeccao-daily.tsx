"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { registrarAtividades } from "@/lib/actions/prospeccao";
import { agendaDate } from "@/lib/agenda-items";
import { canalLabel, isWorkana } from "@/lib/prospeccao";
import type { LeadCanal } from "@/lib/leads";

export function ProspeccaoDaily({ canais }: { canais: LeadCanal[] }) {
  const router = useRouter(); const [busy,setBusy] = useState(false); const [message,setMessage] = useState(""); const [more,setMore] = useState(false);
  const principal = (name: string) => /e-?mail|workana|instagram|google|outros/i.test(name);
  const channels = canais;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(busy)return;
    const form = event.currentTarget; const data = new FormData(form);
    const rows = channels.map(c => ({ canal_id:c.id, contatos:Number(data.get(`${c.id}-contatos`) || 0), propostas:Number(data.get(`${c.id}-propostas`) || 0), respostas:Number(data.get(`${c.id}-respostas`) || 0) }));
    setBusy(true);setMessage("");
    try { const result=await registrarAtividades(String(data.get("data")),rows,String(data.get("observacoes") || ""));if(result.error){setMessage(result.error);return;}form.reset();setMessage("Atividades adicionadas ao dia. Os resultados abaixo foram atualizados.");router.refresh(); }
    catch { setMessage("Não foi possível confirmar o envio. Confira o histórico antes de tentar novamente."); }
    finally {setBusy(false);}
  }
  return <section className="erp-card erp-card--rose p-4">
    <h2 className="text-base font-bold text-ink">Registrar atividades do dia</h2><p className="mt-1 text-xs text-mut">Informe o volume por canal. Na Workana, as propostas contam como abordagens, sem somar duas vezes.</p>
    <form onSubmit={save} className="mt-4 space-y-3"><fieldset disabled={busy} className="min-w-0 space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">Data<input type="date" required name="data" defaultValue={agendaDate()} className="rounded-lg border border-line bg-white px-3 py-2 text-sm" /></label>
      <div className="thin-scroll overflow-x-auto"><table className="w-full min-w-[480px] text-left text-xs"><thead className="border-b border-line bg-soft text-mut"><tr><th className="rounded-tl-lg p-2.5 font-semibold">Canal</th><th className="p-2.5 font-semibold">Contatos feitos</th><th className="p-2.5 font-semibold">Propostas enviadas</th><th className="rounded-tr-lg p-2.5 font-semibold">Respostas recebidas</th></tr></thead><tbody>{channels.map(c => <tr key={c.id} hidden={!more && !principal(c.nome)} className="border-b border-line/70"><th className="p-2.5 font-semibold text-ink">{canalLabel(c.nome)}{isWorkana(c.nome) && <span className="mt-1 block text-[10px] font-normal text-mut">Pode preencher só propostas</span>}</th>{(["contatos","propostas","respostas"] as const).map(metric=><td key={metric} className="p-2"><input aria-label={`${canalLabel(c.nome)}: ${metric}`} name={`${c.id}-${metric}`} type="number" min="0" max="1000000" step="1" placeholder="0" className="w-full min-w-[65px] rounded-lg border border-line px-2 py-2 text-sm" /></td>)}</tr>)}</tbody></table></div>
      {canais.some(c=>!principal(c.nome)) && <button type="button" onClick={()=>setMore(!more)} className="text-xs font-semibold text-brand">{more ? "Mostrar canais principais" : "Mostrar todos os canais"}</button>}
      <label className="block text-xs font-semibold text-mut">Observações do envio<textarea name="observacoes" maxLength={5000} rows={2} className="mt-1 w-full rounded-lg border border-line p-3 font-normal text-ink" placeholder="Ex.: nova abordagem de e-mail, nicho testado, ajustes na mensagem…" /></label>
      <p className="text-[11px] text-mut">Cada envio adiciona os números ao dia. Para corrigir algo já salvo, use os registros abaixo. Respostas podem chegar em dias diferentes do primeiro contato.</p>
      <button disabled={busy || !canais.length} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white" type="submit">{busy ? "Salvando…" : "Salvar atividades"}</button>
    </fieldset>{message && <p role="status" className="text-sm text-mut">{message}</p>}</form>
  </section>;
}
