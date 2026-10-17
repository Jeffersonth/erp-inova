"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { salvarRegraCategoria, excluirRegraCategoria, adicionarRegras, atualizarRegra, excluirRegra } from "@/lib/actions/regras";
import type { Regra, RegraCategoria } from "@/lib/regras";

type Editor = { kind: "category"; category: RegraCategoria | null } | { kind: "rule"; categoryId: string; rule: Regra | null };
const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink";
const panelColors = ["erp-card--lavender","erp-card--peach","erp-card--rose","erp-card--mint"];
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");

export function RulesBoard({ categories,rules }: { categories: RegraCategoria[]; rules: Regra[] }) {
  const router = useRouter();
  const [filter,setFilter] = useState("");
  const [search,setSearch] = useState("");
  const [editing,setEditing] = useState<Editor | null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const query = fold(search.trim());
  const visible = categories.filter(c => (!filter || c.id === filter) && (!query || fold(c.nome).includes(query) || rules.some(r => r.categoria_id === c.id && fold(r.texto).includes(query))));
  async function remove(category: RegraCategoria, rule?: Regra) {
    if (busy) return;
    if (!confirm(rule ? "Excluir este tópico?" : `Excluir a categoria vazia "${category.nome}"?`)) return;
    setBusy(true); setMessage("");
    try {
      const result = rule ? await excluirRegra(rule.id) : await excluirRegraCategoria(category.id);
      setMessage(result.error || (rule ? "Regra excluída." : "Categoria excluída."));
      if (!result.error) { if (!rule && filter === category.id) setFilter(""); router.refresh(); }
    } catch { setMessage("Não foi possível confirmar a exclusão. Atualize a página antes de tentar novamente."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-extrabold text-ink">Regras</h1><p className="mt-1 text-sm text-mut">Seus princípios e compromissos, organizados por categoria.</p></div><button disabled={busy} onClick={()=>setEditing({kind:"category",category:null})} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/>Nova categoria</button></header>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg border border-line bg-white px-3 py-2 text-xs text-mut">{categories.length} categorias · {rules.length} regras</span><input aria-label="Buscar regras" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar regra ou categoria…" className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm sm:min-w-[220px]"/><select aria-label="Filtrar categoria" value={filter} onChange={e=>setFilter(e.target.value)} className="max-w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"><option value="">Todas as categorias</option>{categories.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
    {message && <p role="status" className="text-sm text-mut">{message}</p>}
    {!visible.length && <div className="erp-card px-5 py-12 text-center"><BookOpen className="mx-auto mb-3 text-brand"/><h2 className="font-bold text-ink">{categories.length ? "Nenhuma regra ou categoria encontrada" : "Comece pelas suas categorias"}</h2><p className="mt-2 text-sm text-mut">{categories.length ? "Ajuste a busca ou o filtro para ver suas regras." : "Crie uma categoria e adicione suas regras como tópicos."}</p></div>}
    <div className="grid items-start gap-4 xl:grid-cols-2">{visible.map(category=>{
      const all = rules.filter(r=>r.categoria_id===category.id);
      const items = query && !fold(category.nome).includes(query) ? all.filter(r=>fold(r.texto).includes(query)) : all;
      return <section key={category.id} aria-label={`Categoria ${category.nome}`} className={`erp-card overflow-hidden ${panelColors[categories.findIndex(c=>c.id===category.id)%panelColors.length]}`}>
        <header className="flex items-start justify-between gap-3 border-b border-black/[0.07] px-4 py-3"><div className="min-w-0"><h2 className="break-words text-base font-bold text-ink">{category.nome}</h2><p className="mt-0.5 text-xs text-mut">{all.length} {all.length===1?"regra":"regras"}</p></div><div className="flex shrink-0 gap-1"><button disabled={busy} aria-label={`Renomear categoria ${category.nome}`} onClick={()=>setEditing({kind:"category",category})} className="rounded-lg p-2 text-mut hover:bg-white/70 hover:text-brand"><Pencil size={15}/></button><button disabled={busy || all.length>0} aria-label={`Excluir categoria ${category.nome}`} title={all.length ? "Mova ou exclua as regras antes de excluir a categoria" : "Excluir categoria vazia"} onClick={()=>remove(category)} className="rounded-lg p-2 text-mut hover:bg-white/70 hover:text-danger disabled:opacity-30"><Trash2 size={15}/></button></div></header>
        <div className="space-y-3 p-4">{!all.length && <p className="rounded-lg border border-dashed border-black/10 bg-white/60 p-4 text-sm text-mut">Nenhuma regra nesta categoria ainda.</p>}
          <ul className="space-y-2">{items.map(rule=><li key={rule.id} className="flex items-start gap-2 rounded-xl border border-line bg-white p-3"><span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand"/><p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{rule.texto}</p><div className="flex shrink-0 flex-col gap-0.5 sm:flex-row"><button disabled={busy} aria-label="Editar regra" title="Editar regra" onClick={()=>setEditing({kind:"rule",categoryId:category.id,rule})} className="rounded-md p-1.5 text-mut hover:bg-soft hover:text-brand"><Pencil size={14}/></button><button disabled={busy} aria-label="Excluir regra" title="Excluir regra" onClick={()=>remove(category,rule)} className="rounded-md p-1.5 text-mut hover:bg-soft hover:text-danger"><Trash2 size={14}/></button></div></li>)}</ul>
          <button disabled={busy} onClick={()=>setEditing({kind:"rule",categoryId:category.id,rule:null})} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-brand hover:border-brand"><Plus size={14}/>Adicionar regras</button>
        </div>
      </section>;
    })}</div>
    {editing && <RuleEditor editor={editing} categories={categories} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);setMessage("Alterações salvas.");router.refresh();}}/>}
  </div>;
}

function RuleEditor({ editor,categories,onClose,onSaved }: { editor: Editor; categories: RegraCategoria[]; onClose:()=>void; onSaved:()=>void }) {
  const [busy,setBusy] = useState(false); const [dirty,setDirty] = useState(false); const [error,setError] = useState("");
  const isCategory = editor.kind === "category";
  const title = isCategory ? editor.category ? "Renomear categoria" : "Nova categoria" : editor.rule ? "Editar regra" : "Adicionar regras";
  function close() { if (!busy && (!dirty || confirm("Descartar alterações não salvas?"))) onClose(); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      const result = editor.kind === "category" ? await salvarRegraCategoria(editor.category?.id ?? null,String(form.get("nome") || "")) : editor.rule ? await atualizarRegra(editor.rule.id,String(form.get("categoria")),String(form.get("texto") || "")) : await adicionarRegras(String(form.get("categoria")),String(form.get("texto") || ""));
      if (result.error) setError(result.error); else onSaved();
    } catch { setError("Falha de conexão. Seu texto continua no formulário."); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogTitle>{title}</DialogTitle><DialogDescription>{isCategory ? "Organize suas regras por tema." : editor.rule ? "Você pode editar o texto ou mover a regra para outra categoria." : "Escreva um tópico por linha. Cada linha será salva como uma regra separada."}</DialogDescription><form onSubmit={save} onChange={()=>setDirty(true)} className="space-y-4"><fieldset disabled={busy} className="min-w-0 space-y-3">
    {editor.kind === "category" ? <label className="block text-xs font-semibold text-mut">Nome da categoria<input autoFocus name="nome" required maxLength={100} defaultValue={editor.category?.nome ?? ""} className={field}/></label> : <><label className="block text-xs font-semibold text-mut">Categoria<select name="categoria" required defaultValue={editor.categoryId} className={field}>{categories.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><label className="block text-xs font-semibold text-mut">{editor.rule?"Texto da regra":"Regras, uma por linha"}<textarea autoFocus name="texto" required rows={7} maxLength={editor.rule?2000:100000} defaultValue={editor.rule?.texto ?? ""} placeholder={editor.rule?undefined:"Digite suas regras aqui, uma por linha…"} className={field}/></label></>}
    </fieldset>{error&&<p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={close} className="rounded-lg border border-line px-3 py-2 text-sm text-ink">Cancelar</button><button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">{busy?"Salvando…":"Salvar"}</button></div></form></DialogContent></Dialog>;
}
