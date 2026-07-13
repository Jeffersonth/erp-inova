import { AiDraftButton } from "@/components/ai-draft-button";
import { NewClienteDialog } from "@/components/new-cliente-dialog";
import { EditClienteDialog } from "@/components/edit-cliente-dialog";
import { RecalcularScores } from "@/components/recalcular-scores";
import { toneText } from "@/lib/tone";
import type { Tone } from "@/lib/mock-data";
import { flagEmoji, relativeInteraction } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

const card = "rounded-xl border border-line bg-card";
const cols =
  "grid-cols-[1.7fr_0.6fr_0.9fr_0.9fr_0.7fr_0.9fr_1.6fr_0.8fr]";

const statusLabel: Record<Enums<"cliente_status">, string> = {
  lead: "Lead",
  qualificado: "Qualificado",
  proposta: "Proposta",
  negociacao: "Negociação",
  cliente: "Cliente",
  recorrente: "Recorrente",
  frio: "Lead frio",
  perdido: "Perdido",
};

const statusTone: Record<Enums<"cliente_status">, Tone> = {
  lead: "brand",
  qualificado: "brand",
  proposta: "brand",
  negociacao: "brand",
  cliente: "ok",
  recorrente: "ok",
  frio: "mut",
  perdido: "danger",
};

function scoreTone(score: number | null): Tone {
  if (score == null) return "mut";
  if (score >= 70) return "ok";
  if (score >= 45) return "amber";
  return "danger";
}

export default async function CrmPage() {
  const supabase = createClient();
  const { data: contatos } = await supabase
    .from("clientes")
    .select("*")
    .order("score_ia", { ascending: false, nullsFirst: false });

  const paisesMap = new Map<string, number>();
  for (const c of contatos ?? []) {
    if (!c.pais) continue;
    paisesMap.set(c.pais, (paisesMap.get(c.pais) ?? 0) + 1);
  }
  const totalComPais = Array.from(paisesMap.values()).reduce((s, n) => s + n, 0);
  const distribuicaoPaises = Array.from(paisesMap.entries())
    .map(([pais, count]) => ({ pais, count, pct: totalComPais ? Math.round((count / totalComPais) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">CRM · Contatos</h1>
        <input
          placeholder="Buscar contato…"
          className="order-last w-full min-w-0 basis-full rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink outline-none focus:border-brand sm:order-none sm:w-[220px] sm:basis-auto"
        />
        <RecalcularScores />
        <NewClienteDialog />
      </div>

      {/* Tabela */}
      <div className={`${card} overflow-hidden`}>
        <div className="thin-scroll overflow-x-auto">
          <div className="min-w-[940px]">
            <div className={`grid ${cols} gap-2 border-b border-line bg-soft px-3.5 py-2.5 text-[11px] font-semibold tracking-[0.07em] text-mut`}>
              <span>NOME</span>
              <span>PAÍS</span>
              <span>RAMO</span>
              <span>STATUS</span>
              <span>SCORE IA</span>
              <span>ÚLT. INTERAÇÃO</span>
              <span>PRÓXIMA AÇÃO · IA</span>
              <span />
            </div>
            {!contatos?.length && (
              <div className="px-3.5 py-8 text-center text-[13.5px] text-mut">
                Nenhum contato ainda. Clique em &ldquo;+ Novo contato&rdquo; para começar.
              </div>
            )}
            {contatos?.map((c) => {
              return (
                <div
                  key={c.id}
                  className={`grid ${cols} items-center gap-2 border-b border-line px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-soft`}
                >
                  <div className="min-w-0">
                    <b className="text-[13.5px] text-ink">{c.nome}</b>
                    <div className="truncate text-[12px] text-mut">
                      {[c.contato_nome, c.email].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="text-[13px]">
                    {flagEmoji(c.pais)} {c.pais}
                  </span>
                  <span>
                    {c.ramo && (
                      <span className="rounded-full border border-line bg-soft px-2 py-[2px] text-[11.5px] font-semibold text-ink">
                        {c.ramo}
                      </span>
                    )}
                  </span>
                  <span className={`text-[12.5px] font-semibold ${toneText[statusTone[c.status]]}`}>
                    ● {statusLabel[c.status]}
                  </span>
                  <b className={`text-[14px] ${toneText[scoreTone(c.score_ia)]}`}>{c.score_ia ?? "—"}</b>
                  <span className="text-[12.5px] text-mut">{relativeInteraction(c.ultima_interacao)}</span>
                  <span className="text-[12.5px] text-ia">{c.proxima_acao_ia ?? "—"}</span>
                  <div className="flex items-center gap-1.5 justify-self-start">
                    <AiDraftButton
                      spec={{ tipo: "mensagem_cliente", clienteId: c.id }}
                      fallbackTitle={`Mensagem — ${c.nome}`}
                      label="Rascunhar"
                      className="px-2.5 py-1 text-[12px]"
                    />
                    <EditClienteDialog cliente={c} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Distribuição por país — dados reais dos contatos */}
      {distribuicaoPaises.length > 0 && (
        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[13.5px] text-ink">Distribuição por país</b>
          <div className="mt-2.5 flex flex-col gap-2">
            {distribuicaoPaises.map((d) => (
              <div key={d.pais} className="grid grid-cols-[70px_1fr_70px] items-center gap-2 text-[12.5px]">
                <span className="text-ink">
                  {flagEmoji(d.pais)} {d.pais}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-soft">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="text-right text-mut">
                  {d.count} · {d.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
