"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";
import type { LeadCanal } from "@/lib/leads";

const field =
  "mt-1 w-full rounded-lg border border-line bg-soft px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand";
const label = "text-[10.5px] font-semibold text-mut";

const statusOptions: { value: Enums<"cliente_status">; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "qualificado", label: "Qualificado" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "cliente", label: "Cliente" },
  { value: "recorrente", label: "Recorrente" },
  { value: "frio", label: "Lead frio" },
  { value: "perdido", label: "Perdido" },
];

const paisOptions = [
  { value: "BR", label: "🇧🇷 Brasil" },
  { value: "US", label: "🇺🇸 Estados Unidos" },
  { value: "PT", label: "🇵🇹 Portugal" },
  { value: "DE", label: "🇩🇪 Alemanha" },
  { value: "NO", label: "🇳🇴 Noruega" },
  { value: "ES", label: "🇪🇸 Espanha" },
];

const DEFAULT_ETAPAS = [
  { nome: "A fazer", ordem: 0, final: false },
  { nome: "Em andamento", ordem: 1, final: false },
  { nome: "Revisão", ordem: 2, final: false },
  { nome: "Concluído", ordem: 3, final: true },
];

/** Registra um lead/cliente da prospecção direto no CRM (com os mesmos campos do
 *  "Novo contato"), + projeto opcional com etapas padrão e tarefa inicial. */
export function LeadConverter({ userId, canais }: { userId: string; canais: LeadCanal[] }) {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criarProjeto, setCriarProjeto] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const nome = String(form.get("nome") ?? "").trim();
    const canalId = String(form.get("canal_id") ?? "");
    const canalNome = canais.find((c) => c.id === canalId)?.nome ?? "Prospecção";
    const status = (form.get("status") as Enums<"cliente_status">) || "lead";
    const valorProjeto = String(form.get("valor") ?? "").trim();
    const tituloProjeto = String(form.get("titulo_projeto") ?? "").trim() || `Projeto — ${nome}`;
    const tarefaInicial = String(form.get("tarefa_inicial") ?? "").trim();

    if (!nome || !canalId) {
      setError("Informe o nome do cliente e o canal de origem.");
      setLoading(false);
      return;
    }

    // 1) contato no CRM com a origem registrada (mesmos campos do "Novo contato")
    const { data: cliente, error: cliErr } = await supabase
      .from("clientes")
      .insert({
        user_id: userId,
        nome,
        contato_nome: String(form.get("contato_nome") ?? "").trim() || null,
        ramo: String(form.get("ramo") ?? "").trim() || null,
        email: String(form.get("email") ?? "").trim() || null,
        telefone: String(form.get("telefone") ?? "").trim() || null,
        pais: String(form.get("pais") ?? "BR"),
        status,
        origem: `Leads · ${canalNome}`,
        ultima_interacao: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (cliErr || !cliente) {
      setError("Não foi possível salvar no CRM.");
      setLoading(false);
      return;
    }

    // 2) rastro no histórico do contato (append-only)
    await supabase.from("historico").insert({
      user_id: userId,
      cliente_id: cliente.id,
      tipo: status === "cliente" || status === "recorrente" ? "lead_convertido" : "lead_registrado",
      descricao: `${status === "cliente" || status === "recorrente" ? "Convertido em cliente" : "Lead registrado"} a partir do canal ${canalNome} (módulo Leads).`,
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
            titulo: tarefaInicial || `Kickoff com ${nome}`,
            tipo: "reuniao",
            ordem: 0,
          });
        }
      }
    } else if (tarefaInicial) {
      // sem projeto: a tarefa inicial (se informada) vai para as Tarefas do dia
      await supabase.from("tarefas_dia").insert({ user_id: userId, titulo: tarefaInicial, status: "pendente", ordem: 0 });
    }

    setLoading(false);
    setOpen(false);
    toast(
      status === "cliente" || status === "recorrente"
        ? `✓ ${nome} agora é cliente — origem ${canalNome}`
        : `✓ Lead ${nome} registrado no CRM — origem ${canalNome}`,
    );
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-lg border border-ok/40 px-3 py-[7px] text-xs font-semibold text-ok transition-colors hover:bg-ok/10">
          ↗ Registrar lead no CRM
        </button>
      </DialogTrigger>
      <DialogContent className="w-[460px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[460px]">
        <DialogTitle className="text-[14.5px] font-bold text-ink">Registrar novo lead</DialogTitle>
        <div className="mt-1 text-[11.5px] text-mut">
          Entra automaticamente no CRM com a origem registrada — escolha o status (lead, cliente…), e crie projeto e
          tarefa inicial se quiser.
        </div>
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
          <div>
            <label className={label}>Nome / empresa *</label>
            <input name="nome" required className={field} placeholder="Nome do cliente ou empresa" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>Pessoa de contato</label>
              <input name="contato_nome" className={field} placeholder="Ex: João Prado" />
            </div>
            <div>
              <label className={label}>Ramo</label>
              <input name="ramo" className={field} placeholder="Ex: E-commerce" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>E-mail</label>
              <input name="email" type="email" className={field} placeholder="contato@empresa.com" />
            </div>
            <div>
              <label className={label}>Telefone</label>
              <input name="telefone" className={field} placeholder="+55 11 90000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label}>País</label>
              <select name="pais" defaultValue="BR" className={field}>
                {paisOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Status</label>
              <select name="status" defaultValue="lead" className={field}>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
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

          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink">
            <input
              type="checkbox"
              checked={criarProjeto}
              onChange={(e) => setCriarProjeto(e.target.checked)}
              className="accent-brand"
            />
            Criar projeto para esse contato
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
            <label className={label}>Tarefa inicial (opcional)</label>
            <input name="tarefa_inicial" className={field} placeholder="Ex: Kickoff / enviar proposta / ligar amanhã" />
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
              {loading ? "Salvando…" : "✓ Registrar no CRM"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
