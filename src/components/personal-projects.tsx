"use client";

import { useState, type FormEvent } from "react";
import { Plus, Pencil, Trash2, FolderKanban, Search, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { salvarProjetoPessoal, excluirProjetoPessoal } from "@/lib/actions/projetos-pessoais";
import type { PersonalProject } from "@/lib/personal-projects";

const field = "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand";
const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold disabled:opacity-50";
function progress(p: PersonalProject) {
  return p.etapas.length ? Math.round(p.etapas.filter(e => e.concluida).length / p.etapas.length * 100) : 0;
}
function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

export function PersonalProjects({ initial }: { initial: PersonalProject[] }) {
  const [projects, setProjects] = useState(initial);
  const [draft, setDraft] = useState<PersonalProject | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const visible = projects.filter(p => p.titulo.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")) &&
    (filter === "Todos" || (filter === "Concluídos" ? progress(p) === 100 : progress(p) < 100)));

  function open(project?: PersonalProject) {
    setError("");
    setDraft(project ? structuredClone(project) : { id: crypto.randomUUID(), titulo: "", categoria: "Aplicativo", prazo: null, anotacoes: "", etapas: [] });
  }
  function close() {
    if (busy) return;
    const original = projects.find(p => p.id === draft?.id);
    const changed = draft && (original ? JSON.stringify(original) !== JSON.stringify(draft) : draft.titulo || draft.anotacoes || draft.prazo || draft.etapas.length);
    if (changed && !confirm("Descartar as alterações que ainda não foram salvas?")) return;
    setDraft(null);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true); setError("");
    try {
      const result = await salvarProjetoPessoal(draft);
      if (result.error) { setError(result.error); return; }
      const saved = { ...draft, titulo: draft.titulo.trim(), etapas: draft.etapas.map(e => ({ ...e, titulo: e.titulo.trim() })) };
      setProjects(old => old.some(p => p.id === saved.id) ? old.map(p => p.id === saved.id ? saved : p) : [saved, ...old]);
      setDraft(null); setMessage("Projeto salvo.");
    } catch { setError("Falha de conexão. Tente salvar novamente."); }
    finally { setBusy(false); }
  }
  async function remove(p: PersonalProject) {
    if (busy || !confirm(`Excluir o projeto "${p.titulo}" e suas etapas e anotações?`)) return;
    setBusy(true); setMessage("");
    try {
      const result = await excluirProjetoPessoal(p.id);
      if (result.error) { setMessage(result.error); return; }
      setProjects(old => old.filter(item => item.id !== p.id)); setMessage("Projeto excluído.");
    } catch { setMessage("Falha de conexão. Não foi possível excluir."); }
    finally { setBusy(false); }
  }

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-[18px] font-extrabold text-ink">Projetos - Pessoal</h1><p className="mt-1 text-[13px] text-mut">Um lugar para tirar seus aplicativos, sites e ideias do papel.</p></div>
      <button className={`${button} bg-brand text-white`} onClick={() => open()}><Plus size={16} />Novo projeto</button>
    </div>
    <div className="flex flex-wrap gap-2 text-xs text-mut"><span className="rounded-lg border border-line bg-card px-3 py-2">{projects.filter(p => progress(p) < 100).length} em andamento</span><span className="rounded-lg border border-line bg-card px-3 py-2">{projects.filter(p => progress(p) === 100).length} concluídos</span></div>
    <div className="flex flex-wrap gap-2">
      <label className="relative min-w-0 flex-1"><span className="sr-only">Buscar projeto</span><Search size={16} className="absolute left-3 top-3 text-mut" /><input className={`${field} pl-9`} placeholder="Buscar projeto…" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <select aria-label="Filtrar projetos" className={`${field} w-auto`} value={filter} onChange={e => setFilter(e.target.value)}>{["Todos", "Em andamento", "Concluídos"].map(f => <option key={f}>{f}</option>)}</select>
    </div>
    {message && <p role="status" className="text-sm text-mut">{message}</p>}
    {!visible.length && <div className="rounded-xl border border-dashed border-line bg-card px-4 py-14 text-center"><FolderKanban className="mx-auto mb-3 text-brand" /><h2 className="font-semibold text-ink">{projects.length ? "Nenhum projeto encontrado" : "Qual ideia você quer começar?"}</h2><p className="mt-2 text-sm text-mut">{projects.length ? "Ajuste a busca ou o filtro." : "Crie um projeto, adicione as etapas e acompanhe cada conquista."}</p>{!projects.length && <button className={`${button} mt-4 text-brand`} onClick={() => open()}>Criar meu primeiro projeto</button>}</div>}
    <div className="grid gap-3 lg:grid-cols-2">
      {visible.map(p => { const percent = progress(p); const late = !!p.prazo && p.prazo < today && percent < 100;
        return <article key={p.id} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-xs font-semibold text-brand">{p.categoria}</span><h2 className="mt-1 break-words text-base font-bold text-ink">{p.titulo}</h2></div><div className="flex shrink-0 gap-1"><button aria-label={`Editar ${p.titulo}`} className="rounded-lg p-2 text-mut hover:bg-soft" disabled={busy} onClick={() => open(p)}><Pencil size={16} /></button><button aria-label={`Excluir ${p.titulo}`} className="rounded-lg p-2 text-mut hover:text-red-600" disabled={busy} onClick={() => remove(p)}><Trash2 size={16} /></button></div></div>
          <div className="flex justify-between text-xs text-mut"><span>{percent === 100 ? "Concluído" : "Em andamento"} · {p.etapas.filter(e => e.concluida).length}/{p.etapas.length} etapas</span><span>{percent}%</span></div>
          <div role="progressbar" aria-label={`Progresso de ${p.titulo}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} /></div>
          <p className={`flex items-center gap-2 text-xs ${late ? "text-red-600" : "text-mut"}`}><CalendarDays size={14} />{p.prazo ? `${late ? "Atrasado · " : "Prazo: "}${dateLabel(p.prazo)}` : "Sem prazo definido"}</p>
          {p.anotacoes && <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-mut">{p.anotacoes}</p>}
          <button className={`${button} mt-auto self-start text-brand`} onClick={() => open(p)}>Abrir projeto e etapas</button>
        </article>;
      })}
    </div>
    <Dialog open={!!draft} onOpenChange={value => { if (!value) close(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" onInteractOutside={e => { if (busy) e.preventDefault(); }}>
        <DialogTitle>{projects.some(p => p.id === draft?.id) ? "Editar projeto pessoal" : "Novo projeto pessoal"}</DialogTitle>
        <DialogDescription>Defina o que quer construir e divida em pequenas etapas.</DialogDescription>
        {draft && <form onSubmit={save} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-sm font-semibold text-ink">Título<input autoFocus required maxLength={200} className={`${field} mt-1`} placeholder="Ex.: Meu aplicativo de hábitos" value={draft.titulo} onChange={e => setDraft({ ...draft, titulo: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-ink">Tipo<select className={`${field} mt-1`} value={draft.categoria} onChange={e => setDraft({ ...draft, categoria: e.target.value as PersonalProject["categoria"] })}>{["Aplicativo", "Site", "Outro"].map(c => <option key={c}>{c}</option>)}</select></label><label className="text-sm font-semibold text-ink">Prazo do projeto<input type="date" className={`${field} mt-1`} value={draft.prazo ?? ""} onChange={e => setDraft({ ...draft, prazo: e.target.value || null })} /></label></div>
            <div><h3 className="mb-2 text-sm font-semibold text-ink">Etapas <span className="font-normal text-mut">· marque conforme concluir</span></h3>
              <div className="space-y-2">{draft.etapas.map((step, i) => <div key={step.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-soft p-2">
                <input type="checkbox" aria-label={`Concluir etapa ${i + 1}`} className="size-4 accent-brand" checked={step.concluida} onChange={e => setDraft({ ...draft, etapas: draft.etapas.map(s => s.id === step.id ? { ...s, concluida: e.target.checked } : s) })} />
                <input aria-label={`Título da etapa ${i + 1}`} required maxLength={200} className={`${field} min-w-0 flex-1 ${step.concluida ? "line-through text-mut" : ""}`} placeholder="Nome da etapa" value={step.titulo} onChange={e => setDraft({ ...draft, etapas: draft.etapas.map(s => s.id === step.id ? { ...s, titulo: e.target.value } : s) })} />
                <input aria-label={`Prazo da etapa ${i + 1}`} type="date" className={`${field} w-auto max-w-full`} value={step.prazo} onChange={e => setDraft({ ...draft, etapas: draft.etapas.map(s => s.id === step.id ? { ...s, prazo: e.target.value } : s) })} />
                <button type="button" aria-label={`Remover etapa ${i + 1}`} className="p-2 text-mut hover:text-red-600" onClick={() => setDraft({ ...draft, etapas: draft.etapas.filter(s => s.id !== step.id) })}><Trash2 size={16} /></button>
              </div>)}</div>
              <button type="button" disabled={draft.etapas.length >= 100} className={`${button} mt-2 text-brand`} onClick={() => setDraft({ ...draft, etapas: [...draft.etapas, { id: crypto.randomUUID(), titulo: "", prazo: "", concluida: false }] })}><Plus size={15} />Adicionar etapa</button>
            </div>
            <label className="block text-sm font-semibold text-ink">Anotações<textarea rows={5} maxLength={50000} className={`${field} mt-1 resize-y font-normal`} placeholder="Ideias, links, decisões e próximos passos…" value={draft.anotacoes} onChange={e => setDraft({ ...draft, anotacoes: e.target.value })} /></label>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={button} onClick={close}>Cancelar</button><button disabled={busy} className={`${button} bg-brand text-white`} type="submit">{busy ? "Salvando…" : "Salvar projeto"}</button></div>
        </form>}
      </DialogContent>
    </Dialog>
  </div>;
}
