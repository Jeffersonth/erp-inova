import Link from "next/link";
import { NewProjetoDialog } from "@/components/new-projeto-dialog";
import { ProjectHeader } from "@/components/project-header";
import { ProjectBoard, type BoardEtapa } from "@/components/project-board";
import { ArquivosBox } from "@/components/arquivos-box";
import { ProjetoNotas, type ProjetoNota } from "@/components/projeto-notas";
import { formatMoney, relativeDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

const card = "rounded-xl border border-line bg-card";

export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: { p?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: projetos }, { data: clientes }] = await Promise.all([
    supabase
      .from("projetos")
      .select("id, titulo, cliente_id, valor, moeda, data_entrega, status")
      .order("created_at", { ascending: true }),
    supabase.from("clientes").select("id, nome").order("nome"),
  ]);

  const lista = projetos ?? [];
  const clientesList = clientes ?? [];
  const ativos = lista.filter((p) => p.status !== "concluido");
  const arquivados = lista.filter((p) => p.status === "concluido");

  // Nenhum projeto ainda
  if (lista.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Projetos</h1>
          <NewProjetoDialog clientes={clientesList} />
        </div>
        <div className={`${card} px-3.5 py-12 text-center`}>
          <div className="text-[13px] font-semibold text-ink">Nenhum projeto ainda</div>
          <div className="mt-1 text-[12px] text-mut">
            Crie seu primeiro projeto e monte o quadro de tarefas com as etapas e cards que quiser.
          </div>
        </div>
      </div>
    );
  }

  // Projeto selecionado (via ?p=; fallback = primeiro ativo, senão primeiro da lista)
  const selecionado = lista.find((p) => p.id === searchParams.p) ?? ativos[0] ?? lista[0];
  const finalizada = selecionado.status === "concluido";

  const [{ data: etapas }, { data: tarefas }, { data: notas }] = await Promise.all([
    supabase.from("etapas").select("id, nome, ordem, final").eq("projeto_id", selecionado.id).order("ordem"),
    supabase
      .from("tarefas")
      .select("id, titulo, descricao, tipo, concluida, ordem, etapa_id")
      .eq("projeto_id", selecionado.id)
      .order("ordem"),
    supabase
      .from("projeto_notas")
      .select("id, texto, prioridade")
      .eq("projeto_id", selecionado.id)
      .order("prioridade", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const boardEtapas: BoardEtapa[] = (etapas ?? []).map((e) => ({
    id: e.id,
    nome: e.nome,
    ordem: e.ordem,
    final: e.final,
    tarefas: (tarefas ?? [])
      .filter((t) => t.etapa_id === e.id)
      .map((t) => ({
        id: t.id,
        titulo: t.titulo,
        descricao: t.descricao,
        tipo: t.tipo,
        concluida: t.concluida,
        ordem: t.ordem,
      })),
  }));

  const clienteNome = clientesList.find((c) => c.id === selecionado.cliente_id)?.nome ?? null;
  const partes: string[] = [];
  if (selecionado.valor != null) {
    partes.push(formatMoney(Number(selecionado.valor), selecionado.moeda as Enums<"moeda">));
  }
  if (selecionado.data_entrega) partes.push(`entrega ${relativeDate(selecionado.data_entrega)}`);
  const metaLinha = partes.join(" · ") || "sem valor ou prazo definido";

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Projetos</h1>
        <span className="text-[11.5px] text-mut">arraste os cards entre as etapas</span>
        <NewProjetoDialog clientes={clientesList} />
      </div>

      {/* Seletor de projetos ativos */}
      {ativos.length > 0 && (
        <div className="thin-scroll -mb-1 flex gap-1.5 overflow-x-auto pb-1">
          {ativos.map((p) => {
            const ativo = p.id === selecionado.id;
            return (
              <Link
                key={p.id}
                href={`/projetos?p=${p.id}`}
                className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  ativo
                    ? "border-brand bg-brand/[0.06] text-brand"
                    : "border-line bg-card text-mut hover:border-brand hover:text-ink"
                }`}
              >
                {p.titulo}
              </Link>
            );
          })}
        </div>
      )}

      {/* Projeto selecionado — key força reset completo do estado ao trocar de projeto */}
      <div key={selecionado.id} className="flex flex-col gap-3">
        <div className={`${card} flex flex-col gap-3 px-3.5 py-3`}>
          <ProjectHeader
            projeto={{
              id: selecionado.id,
              titulo: selecionado.titulo,
              clienteId: selecionado.cliente_id,
              valor: selecionado.valor != null ? Number(selecionado.valor) : null,
              moeda: selecionado.moeda as Enums<"moeda">,
              dataEntrega: selecionado.data_entrega,
            }}
            clienteNome={clienteNome}
            metaLinha={metaLinha}
            clientes={clientesList}
            finalizada={finalizada}
          />
          <ProjectBoard projetoId={selecionado.id} userId={user?.id ?? ""} initialEtapas={boardEtapas} />
        </div>

        {/* Anotações importantes do projeto */}
        <ProjetoNotas
          projetoId={selecionado.id}
          userId={user?.id ?? ""}
          initial={(notas ?? []) as ProjetoNota[]}
        />

        {/* Arquivos enviados pelo cliente */}
        <div className={`${card} px-3.5 py-3`}>
          <div className="mb-2 flex items-center gap-2">
            <b className="text-[12.5px] text-ink">Arquivos do projeto</b>
            <span className="text-[11px] text-mut">materiais enviados pelo cliente</span>
          </div>
          <ArquivosBox
            scope="projeto"
            ownerId={selecionado.id}
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,application/pdf,image/*"
            titulo="PDF, imagens e documentos"
            ajuda="Aceita PDF, PNG, JPG e DOC/DOCX (máx. 15 MB por arquivo)."
          />
        </div>
      </div>

      {/* Projetos finalizados (arquivados) */}
      {arquivados.length > 0 && (
        <div className="mt-2">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-mut">Projetos finalizados</span>
            <span className="rounded-full border border-line bg-card px-1.5 text-[9.5px] text-mut">{arquivados.length}</span>
            <div className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {arquivados.map((p) => {
              const nome = clientesList.find((c) => c.id === p.cliente_id)?.nome;
              const ativo = p.id === selecionado.id;
              return (
                <Link
                  key={p.id}
                  href={`/projetos?p=${p.id}`}
                  className={`${card} flex items-center gap-2 px-3 py-2.5 opacity-90 transition-colors hover:border-brand hover:opacity-100 ${
                    ativo ? "border-brand" : ""
                  }`}
                >
                  <span className="flex-none text-ok">✓</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold text-ink">{p.titulo}</div>
                    <div className="truncate text-[11px] text-mut">{nome ?? "sem cliente"}</div>
                  </div>
                  <span className="flex-none text-[11px] font-semibold text-mut">abrir →</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
