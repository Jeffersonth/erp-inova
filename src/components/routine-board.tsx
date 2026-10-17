"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Plus, Pencil, Trash2, Utensils, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { salvarRotinaItem, excluirRotinaItem } from "@/lib/actions/rotina";
import { DIAS_SEMANA, rotinaHorarioOrdem, type RotinaInput, type RotinaItem } from "@/lib/rotina";
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink";
export function RoutineBoard({ items }: { items: RotinaItem[] }) {
  const router = useRouter(); const [day,setDay] = useState(""); const [search,setSearch] = useState("");
  const [editor,setEditor] = useState<{ type: RotinaItem["tipo"]; item: RotinaItem | null } | null>(null);
  const [busy,setBusy] = useState(false); const [message,setMessage] = useState("");
  const query = fold(search.trim());
  const visible = items.filter(item=>(day==="" || item.dias.includes(Number(day))) && (!query || fold(`${item.titulo} ${item.descricao}`).includes(query))).sort((a,b)=>rotinaHorarioOrdem(a.horario)-rotinaHorarioOrdem(b.horario)||a.ordem-b.ordem);
  async function remove(item: RotinaItem) {
    if (busy || !confirm(`Excluir "${item.titulo}" deste plano?`)) return;
    setBusy(true); setMessage("");
    try { const result = await excluirRotinaItem(item.id); setMessage(result.error || "Item excluído."); if (!result.error) router.refresh(); }
    catch { setMessage("Não foi possível confirmar a exclusão. Atualize a página antes de tentar novamente."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-extrabold text-ink">Rotina e Dieta</h1><p className="mt-1 text-sm text-mut">Seus horários, atividades e refeições em um só lugar.</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>setEditor({type:"rotina",item:null})} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white"><Plus size={16}/>Atividade</button><button disabled={busy} onClick={()=>setEditor({type:"refeicao",item:null})} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-semibold text-brand"><Plus size={16}/>Refeição</button></div></header>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg border border-line bg-white px-3 py-2 text-xs text-mut">{items.filter(i=>i.tipo==="rotina").length} atividades · {items.filter(i=>i.tipo==="refeicao").length} refeições</span><input aria-label="Buscar na rotina e dieta" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar atividade ou refeição…" className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm sm:min-w-[220px]"/><select aria-label="Filtrar dia da semana" value={day} onChange={e=>setDay(e.target.value)} className="max-w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"><option value="">Todos os dias</option>{[1,2,3,4,5,6,0].map(d=><option key={d} value={d}>{["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"][d]}</option>)}</select></div>
    {message && <p role="status" className="text-sm text-mut">{message}</p>}
    <div className="grid items-start gap-4 xl:grid-cols-[1.1fr_.9fr]">{(["rotina","refeicao"] as const).map(type=>{
      const rows = visible.filter(i=>i.tipo===type); const meal=type==="refeicao";
      return <section key={type} aria-label={meal?"Dieta":"Rotina"} className={`erp-card overflow-hidden ${meal?"erp-card--peach":"erp-card--lavender"}`}>
        <header className="flex items-center gap-2 border-b border-black/[0.07] px-4 py-3">{meal?<Utensils size={18} className="text-aqua"/>:<CalendarDays size={18} className="text-brand"/>}<h2 className="font-bold text-ink">{meal?"Dieta e refeições":"Rotina do dia"}</h2><span className="ml-auto text-xs text-mut">{rows.length} {rows.length===1?"item":"itens"}</span></header>
        <div className="space-y-3 p-4">{!rows.length && <p className="rounded-xl border border-dashed border-black/10 bg-white/60 p-5 text-sm text-mut">{search || day!=="" ? "Nenhum item neste filtro." : meal ? "Cadastre seus horários de refeição e descreva os alimentos." : "Adicione suas atividades e horários."}</p>}
          {rows.map(item=><article key={item.id} aria-label={`${item.horario} ${item.titulo}`} className="rounded-xl border border-line bg-white p-3"><div className="flex items-start gap-2.5"><span className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold tabular-nums ${meal?"bg-orange-50 text-aqua":"bg-brand/10 text-brand"}`}><Clock3 size={12}/>{item.horario}</span><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-bold text-ink">{item.titulo}</h3><p className="mt-1 text-[11px] text-mut">{item.dias.length===7?"Todos os dias":item.dias.map(d=>DIAS_SEMANA[d]).join(" · ")}</p></div><div className="flex shrink-0 flex-col sm:flex-row"><button disabled={busy} onClick={()=>setEditor({type:item.tipo,item})} aria-label={`Editar ${item.titulo}`} className="rounded-md p-1.5 text-mut hover:bg-soft hover:text-brand"><Pencil size={14}/></button><button disabled={busy} onClick={()=>remove(item)} aria-label={`Excluir ${item.titulo}`} className="rounded-md p-1.5 text-mut hover:bg-soft hover:text-danger"><Trash2 size={14}/></button></div></div>
            {item.descricao ? <p className="mt-3 whitespace-pre-wrap break-words border-t border-line pt-3 text-sm leading-relaxed text-ink">{item.descricao}</p> : meal ? <p className="mt-3 border-t border-line pt-3 text-xs text-mut">Alimentos e quantidades ainda não informados.</p> : null}
          </article>)}
          <button disabled={busy} onClick={()=>setEditor({type,item:null})} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-brand"><Plus size={14}/>{meal?"Adicionar refeição":"Adicionar atividade"}</button>
        </div>
      </section>;
    })}</div>
    {editor && <RoutineEditor type={editor.type} item={editor.item} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setMessage("Alterações salvas.");router.refresh();}}/>}
  </div>;
}
function RoutineEditor({ type,item,onClose,onSaved }: { type: RotinaItem["tipo"]; item: RotinaItem | null; onClose:()=>void; onSaved:()=>void }) {
  const [busy,setBusy] = useState(false); const [dirty,setDirty] = useState(false); const [error,setError] = useState("");
  function close() { if (!busy && (!dirty || confirm("Descartar alterações não salvas?"))) onClose(); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    const input: RotinaInput = { tipo:String(form.get("tipo")) as RotinaItem["tipo"],titulo:String(form.get("titulo")||""),horario:String(form.get("horario")||""),dias:form.getAll("dias").map(Number),descricao:String(form.get("descricao")||"") };
    if (!input.dias.length) { setError("Selecione pelo menos um dia da semana."); return; }
    setBusy(true); setError("");
    try { const result=await salvarRotinaItem(item?.id??null,input); if(result.error)setError(result.error);else onSaved(); }
    catch { setError("Falha de conexão. Suas alterações continuam no formulário."); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogTitle>{item?"Editar item":type==="refeicao"?"Nova refeição":"Nova atividade"}</DialogTitle><DialogDescription>Defina o horário, os dias da semana e os detalhes do seu plano.</DialogDescription><form onSubmit={save} onChange={()=>setDirty(true)} className="space-y-4"><fieldset disabled={busy} className="min-w-0 space-y-3">
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-mut">Área<select aria-label="Área" name="tipo" defaultValue={item?.tipo??type} className={field}><option value="rotina">Rotina</option><option value="refeicao">Dieta e refeições</option></select></label><label className="text-xs font-semibold text-mut">Horário<input aria-label="Horário" name="horario" type="time" required defaultValue={item?.horario??"09:00"} className={field}/></label></div>
    <label className="block text-xs font-semibold text-mut">Título<input autoFocus aria-label="Título" name="titulo" required maxLength={150} defaultValue={item?.titulo??""} className={field}/></label>
    <fieldset className="min-w-0"><legend className="mb-2 text-xs font-semibold text-mut">Dias da semana</legend><div className="flex flex-wrap gap-2">{[1,2,3,4,5,6,0].map(d=><label key={d} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-2 text-xs text-ink"><input name="dias" type="checkbox" value={d} defaultChecked={item?item.dias.includes(d):true}/>{DIAS_SEMANA[d]}</label>)}</div></fieldset>
    <label className="block text-xs font-semibold text-mut">Detalhes e observações<textarea aria-label="Detalhes e observações" name="descricao" rows={5} maxLength={10000} defaultValue={item?.descricao??""} placeholder="Descreva a atividade ou informe os alimentos e quantidades da refeição…" className={field}/></label>
    </fieldset>{error&&<p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex justify-end gap-2"><button disabled={busy} type="button" onClick={close} className="rounded-lg border border-line px-3 py-2 text-sm">Cancelar</button><button disabled={busy} type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">{busy?"Salvando…":"Salvar"}</button></div></form></DialogContent></Dialog>;
}
