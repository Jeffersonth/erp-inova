import { IaBadge } from "@/components/ia-badge";
import { AiDraftButton } from "@/components/ai-draft-button";
import { NewClienteDialog } from "@/components/new-cliente-dialog";
import { toneText } from "@/lib/tone";
import type { Tone } from "@/lib/mock-data";
import { distribuicao } from "@/lib/mock-data";
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

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">CRM · Contatos</h1>
        <input
          placeholder="Buscar contato…"
          className="order-last w-full min-w-0 basis-full rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-brand sm:order-none sm:w-[220px] sm:basis-auto"
        />
        <NewClienteDialog />
      </div>

      {/* Tabela */}
      <div className={`${card} overflow-hidden`}>
        <div className="thin-scroll overflow-x-auto">
          <div className="min-w-[940px]">
            <div className={`grid ${cols} gap-2 border-b border-line bg-soft px-3.5 py-2.5 text-[10px] font-semibold tracking-[0.07em] text-mut`}>
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
              <div className="px-3.5 py-8 text-center text-[12.5px] text-mut">
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
                    <b className="text-[12.5px] text-ink">{c.nome}</b>
                    <div className="truncate text-[11px] text-mut">
                      {[c.contato_nome, c.email].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="text-[12px]">
                    {flagEmoji(c.pais)} {c.pais}
                  </span>
                  <span>
                    {c.ramo && (
                      <span className="rounded-full border border-line bg-soft px-2 py-[2px] text-[10.5px] font-semibold text-ink">
                        {c.ramo}
                      </span>
                    )}
                  </span>
                  <span className={`text-[11.5px] font-semibold ${toneText[statusTone[c.status]]}`}>
                    ● {statusLabel[c.status]}
                  </span>
                  <b className={`text-[13px] ${toneText[scoreTone(c.score_ia)]}`}>{c.score_ia ?? "—"}</b>
                  <span className="text-[11.5px] text-mut">{relativeInteraction(c.ultima_interacao)}</span>
                  <span className="text-[11.5px] text-ia">{c.proxima_acao_ia ?? "—"}</span>
                  <AiDraftButton
                    spec={{ tipo: "mensagem_cliente", clienteId: c.id }}
                    fallbackTitle={`Mensagem — ${c.nome}`}
                    label="Rascunhar"
                    className="justify-self-start px-2.5 py-1 text-[11px]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mapa + distribuição */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.5fr_1fr]">
        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[12.5px] text-ink">Clientes pelo mundo</b>
          <svg width="100%" height="170" viewBox="0 0 520 170" className="mt-1.5">
            <g fill="#E9EFF8" stroke="#DCE4F0" strokeWidth="1">
              <path d="M60,30 Q95,18 130,30 Q150,40 142,62 Q128,78 100,74 Q70,70 58,52 Q52,38 60,30 Z" />
              <path d="M128,86 Q150,80 162,96 Q172,118 158,140 Q144,156 132,144 Q118,120 122,100 Z" />
              <path d="M228,42 Q252,28 284,34 Q304,40 298,58 Q286,72 258,70 Q234,66 228,54 Z" />
              <path d="M240,84 Q268,76 288,92 Q300,112 288,132 Q270,148 252,136 Q236,116 240,96 Z" />
              <path d="M312,36 Q360,22 412,34 Q444,44 436,70 Q420,92 376,88 Q332,82 316,60 Q306,46 312,36 Z" />
              <path d="M420,110 Q446,102 462,116 Q470,132 456,142 Q438,150 426,138 Q416,124 420,110 Z" />
            </g>
            <circle cx="146" cy="118" r="11" fill="rgba(29,91,255,.2)" />
            <circle cx="146" cy="118" r="5.5" fill="#1D5BFF" />
            <circle cx="92" cy="52" r="8" fill="rgba(29,91,255,.2)" />
            <circle cx="92" cy="52" r="4" fill="#1D5BFF" />
            <circle cx="262" cy="48" r="7" fill="rgba(0,209,255,.25)" />
            <circle cx="262" cy="48" r="3.5" fill="#00D1FF" />
            <circle cx="278" cy="56" r="5.5" fill="rgba(0,209,255,.25)" />
            <circle cx="278" cy="56" r="3" fill="#00D1FF" />
            <text x="146" y="146" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748B">BR · 3</text>
            <text x="92" y="34" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748B">US · 1</text>
            <text x="270" y="30" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748B">EU · 2</text>
          </svg>
        </div>

        <div className={`${card} flex flex-col px-3.5 py-3`}>
          <b className="text-[12.5px] text-ink">Distribuição internacional</b>
          <div className="mt-3 flex flex-col gap-2.5">
            {distribuicao.map((d) => (
              <div key={d.pais} className="grid grid-cols-[44px_1fr_40px] items-center gap-2 text-[11.5px]">
                <span>
                  {d.flag} {d.pais}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-soft">
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.fill }} />
                </div>
                <b className="text-ink">{d.pct}%</b>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-3.5 text-[11.5px] text-mut">
            <span>
              Receita BR: <b className="text-ink">R$ 12,1k</b>
            </span>
            <span>
              Exterior: <b className="text-ink">R$ 9,2k eq.</b>
            </span>
          </div>
          <div className="mt-auto flex items-start gap-2 border-t border-dashed border-line pt-3">
            <IaBadge className="mt-px" />
            <span className="text-[11.5px] text-mut">
              Clientes no exterior pagam <b className="text-ink">2,3× mais por hora</b>. Com 1 cliente EU a mais, sua receita cresce ~28% sem aumentar horas.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
