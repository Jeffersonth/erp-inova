"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";
import type { LeadCanal } from "@/lib/leads";

const field =
  "mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand";
const label = "text-[10.5px] font-semibold text-mut";

const DEFAULT_ETAPAS = [
  { nome: "A fazer", ordem: 0, final: false },
  { nome: "Em andamento", ordem: 1, final: false },
  { nome: "Revisão", ordem: 2, final: false },
  { nome: "Concluído", ordem: 3, final: true },
];

/** Converte um lead da prospecção em cliente do CRM (+ projeto e tarefa inicial opcionais). */
export function LeadConverter({ userId, canais }: { userId: string; canais: LeadCanal[] }) {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criarProjeto, setCriarProjeto] = useState(true);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const nome = String(form.get("nome") ?? "").trim();
    const canalId = String(form.get("canal_id") ?? "");
    const canalNome = canais.find((c) => c.id === canalId)?.nome ?? "Prospecção";
    const email = String(form.get("email") ?? "").trim() || null;
    const telefone = String(form.get("telefone") ?? "").trim() || null;
    const valorProjeto = String(form.get("valor") ?? "").trim();
    const tituloProjeto = String(form.get("titulo_projeto") ?? "").trim() || `Projeto — ${nome}`;
    const tarefaInicial = String(form.get("tarefa_inicial") ?? "").trim() || `Kickoff com ${nome}`;

    if (!nome || !canalId) {
      setError("Informe o nome do cliente e o canal de origem.");
      setLoading(false);
      return;
    }

    // 1) cliente no CRM com a origem registrada
    const { data: cliente, error: cliErr } = await supabase
      .from("clientes")
      .insert({
        user_id: userId,
        nome,
        email,
        telefone,
        pais: "BR",
        status: "cliente",
        origem: `Leads · ${canalNome}`,
        ultima_interacao: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (cliErr || !cliente) {
      setError("Não foi possível criar o cliente no CRM.");
      setLoading(false);
      return;
    }

    // 2) rastro no histórico do cliente (append-only)
    await supabase.from("historico").insert({
      user_id: userId,
      cliente_id: cliente.id,
      tipo: "lead_convertido",
      descricao: `Lead convertido em cliente a partir do canal ${canalNome} (módulo Leads).`,
      origem_ia: false,
    });

    // 3) projeto opcional com etapas padrão + tarefa inicial no quadro
    if (criarProjeto) {
      const { data: projeto } = await supabase
        .from("projetos")
        .insert({
          user_id: userId,
          titulo: tituloProjeto,
          cliente_id: cliente.id,
          valor: valorProjeto ? Number(valorProjeto.replace(",", ".")) : null,
          status: "briefing",
          progresso: 0,
        })
        .select("id")
        .single();
      if (projeto) {
        const { data: etapas } = await supabase
          .from("etapas")
          .insert(DEFAULT_ETAPAS.map((e) => ({ ...e, projeto_id: projeto.id })))
          .select("id, ordem");
        const primeira = (etapas ?? []).find((e) => e.ordem === 0) ?? (etapas ?? [])[0];
        if (primeira) {
          await supabase.from("tarefas").insert({
            user_id: userId,
            projeto_id: projeto.id,
            etapa_id: primeira.id,
            titulo: tarefaInicial,
            tipo: "reuniao",
            ordem: 0,
          });
        }
      }
    } else {
      // sem projeto: a tarefa inicial vai para as Tarefas do dia
      await supabase.from("tarefas_dia").insert({ user_id: userId, titulo: tarefaInicial, status: "pendente", ordem: 0 });
    }

    setLoading(false);
    setOpen(false);
    toast(`✓ ${nome} agora é cliente — origem ${canalNome}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-lg border border-ok/40 px-3 py-[7px] text-xs font-semibold text-ok transition-colors hover:bg-ok/10">
          ↗ Converter em cliente
        </button>
      </DialogTrigger>
      <DialogContent className="w-[440px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[440px]">
        <DialogTitle className="text-[14.5px] font-bold text-ink">Converter lead em cliente</DialogTitle>
        <div className="mt-1 text-[11.5px] text-mut">
          Cria o cliente no CRM com a origem registrada, um projeto (opcional) e a tarefa inicial.
        </div>
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
          <div>
            <label className={label}>Nome do cliente *</label>
            <input name="nome" required className={field} placeholder="Ex: Clínica Vida" />
          </div>
          <div>
            <label className={label}>Canal de origem *</label>
            <select name="canal_id" required defaultValue="" className={field}>
              <option value="" disabled>
                De onde esse lead veio?
              </option>
              {canais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>E-mail</label>
              <input name="email" type="email" className={field} placeholder="contato@…" />
            </div>
            <div>
              <label className={label}>Telefone</label>
              <input name="telefone" className={field} placeholder="(11) 9…" />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink">
            <input type="checkbox" checked={criarProjeto} onChange={(e) => setCriarProjeto(e.target.checked)} className="accent-brand" />
            Criar projeto para esse cliente
          </label>
          {criarProjeto && (
            <div className="grid grid-cols-[1.4fr_1fr] gap-2.5 rounded-lg border border-line bg-soft px-3 py-2.5">
              <div>
                <label className={label}>Título do projeto</label>
                <input name="titulo_projeto" className={`${field} bg-card`} placeholder="Projeto — nome do cliente" />
              </div>
              <div>
                <label className={label}>Valor (R$)</label>
                <input name="valor" type="number" min="0" step="0.01" className={`${field} bg-card`} placeholder="0,00" />
              </div>
            </div>
          )}
          <div>
            <label className={label}>Tarefa inicial</label>
            <input name="tarefa_inicial" className={field} placeholder="Kickoff com o cliente" />
          </div>

          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] text-danger">{error}</div>
          )}

          <div className="mt-1 flex justify-end gap-2">
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
              {loading ? "Convertendo…" : "✓ Converter"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
