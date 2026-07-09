import { IaBadge } from "@/components/ia-badge";
import { DraftButton } from "@/components/draft-button";
import { NewProjetoDialog } from "@/components/new-projeto-dialog";
import { toneText } from "@/lib/tone";
import type { Tone } from "@/lib/mock-data";
import { arquivosLandingX } from "@/lib/mock-data";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard, type KanbanColumn } from "@/components/kanban-board";
import type { Enums } from "@/lib/supabase/database.types";

const card = "rounded-xl border border-line bg-card";

const colOrder: Enums<"projeto_status">[] = [
  "briefing",
  "proposta",
  "aprovado",
  "dev",
  "revisao",
  "entrega",
  "concluido",
];
const colName: Record<Enums<"projeto_status">, string> = {
  briefing: "Briefing",
  proposta: "Proposta",
  aprovado: "Aprovado",
  dev: "Em dev",
  revisao: "Revisão",
  entrega: "Entrega",
  concluido: "Concluído",
};

function formatPrazo(data: string | null) {
  if (!data) return "a definir";
  const [, m, d] = data.split("-");
  return `${d}/${m}`;
}

const etapaStatusLabel: Record<Enums<"etapa_status">, string> = {
  prevista: "pendente",
  em_andamento: "● em andamento",
  concluida: "✓ concluída",
  atrasada: "⚠ atrasada",
};
const etapaStatusTone: Record<Enums<"etapa_status">, Tone> = {
  prevista: "mut",
  em_andamento: "brand",
  concluida: "ok",
  atrasada: "danger",
};

export default async function ProjetosPage() {
  const supabase = createClient();

  const [{ data: projetos }, { data: destaque }, { data: clientes }] = await Promise.all([
    supabase.from("projetos").select("*"),
    supabase.from("projetos").select("*").eq("titulo", "Landing X").maybeSingle(),
    supabase.from("clientes").select("id, nome").order("nome"),
  ]);

  const cols: KanbanColumn[] = colOrder.map((status) => ({
    id: status,
    name: colName[status],
    cards: (projetos ?? [])
      .filter((p) => p.status === status)
      .map((p) => ({
        id: p.id,
        title: p.titulo,
        valor: p.valor != null ? formatMoney(Number(p.valor), p.moeda) : "—",
        prazo: formatPrazo(p.data_entrega),
        progress: p.progresso,
        risk: p.risco_atraso,
        done: p.status === "concluido",
      })),
  }));

  const [{ data: etapas }, { data: checklist }] = destaque
    ? await Promise.all([
        supabase.from("etapas").select("*").eq("projeto_id", destaque.id).order("ordem"),
        supabase.from("checklist_itens").select("*").eq("projeto_id", destaque.id).order("ordem"),
      ])
    : [{ data: null }, { data: null }];

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Projetos</h1>
        <span className="text-[11.5px] text-mut">arraste os cards entre as colunas</span>
        <NewProjetoDialog clientes={clientes ?? []} />
      </div>

      <KanbanBoard initialColumns={cols} />

      {destaque && (
        <>
          {/* Checklist inteligente */}
          <div className={`${card} px-3.5 py-3`}>
            <div className="flex items-center gap-2">
              <b className="text-[12.5px] text-ink">Checklist inteligente — {destaque.titulo}</b>
              <span className="text-[11px] font-semibold text-ia">a IA marca itens detectados em e-mails e commits</span>
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
              {checklist?.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className={item.concluido ? "font-bold text-ok" : "text-mut"}>{item.concluido ? "☑" : "☐"}</span>
                  <span className={item.concluido ? "text-mut line-through" : "text-ink"}>{item.texto}</span>
                  {item.marcado_por_ia && item.fonte && <span className="text-[10px] text-ia">{item.fonte}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Prazos + Arquivos */}
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.4fr_1fr]">
            {/* Prazos por etapa */}
            <div className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2 px-3.5 pt-3">
                <b className="text-[12.5px] text-ink">Prazos por etapa — {destaque.titulo}</b>
                <DraftButton
                  draftKey="prazosIA"
                  label="✦ Distribuir prazos (IA)"
                  className="ml-auto border-aqua/45 text-ia hover:bg-aqua/10"
                />
              </div>
              <div className="mt-2 grid grid-cols-[1.3fr_0.8fr_1fr_1.1fr] gap-2 border-b border-line px-3.5 py-2 text-[10px] font-semibold tracking-[0.07em] text-mut">
                <span>ETAPA</span>
                <span>PRAZO</span>
                <span>STATUS</span>
                <span>DURAÇÃO VS MÉDIA</span>
              </div>
              {etapas?.map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-[1.3fr_0.8fr_1fr_1.1fr] items-center gap-2 border-b border-line px-3.5 py-[7px] text-[12px] last:border-b-0"
                >
                  <span className={e.status === "em_andamento" ? "font-bold text-ink" : "text-ink"}>{e.nome}</span>
                  <span className="font-semibold text-mut">{formatPrazo(e.prazo)}</span>
                  <span className={`font-semibold ${toneText[etapaStatusTone[e.status]]}`}>{etapaStatusLabel[e.status]}</span>
                  <span className="text-mut">
                    {e.duracao_dias != null ? `${e.duracao_dias}d · média ${e.media_dias}d` : `— · média ${e.media_dias ?? "—"}d`}
                  </span>
                </div>
              ))}
            </div>

            {/* Arquivos do projeto */}
            <div className={`${card} flex flex-col gap-2 px-3.5 py-3`}>
              <div className="flex items-center gap-2">
                <b className="text-[12.5px] text-ink">Arquivos do projeto</b>
                <span className="text-[10.5px] font-semibold text-ia">tipos classificados pela IA</span>
              </div>
              {arquivosLandingX.map((f) => (
                <div key={f.nome} className="flex items-center gap-2.5 border-t border-line py-[7px] text-[12px]">
                  <span className="flex size-[26px] flex-none items-center justify-center rounded-md border border-line bg-soft text-[11px]">
                    {f.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{f.nome}</span>
                  <IaBadge className="ml-auto text-ia">{f.tipo}</IaBadge>
                </div>
              ))}
              <DraftButton
                draftKey="contrato"
                label="✦ Gerar contrato (IA)"
                solid
                className="mt-auto w-full justify-center py-2.5 text-xs"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
