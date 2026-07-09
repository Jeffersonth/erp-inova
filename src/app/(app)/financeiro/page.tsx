import { IaBadge } from "@/components/ia-badge";
import { AiDraftButton } from "@/components/ai-draft-button";
import { toneText, riskPill } from "@/lib/tone";
import type { Tone } from "@/lib/mock-data";
import { lucroCliente } from "@/lib/mock-data";
import { formatMoney, relativeDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const card = "rounded-xl border border-line bg-card";
const recCols = "grid-cols-[1.6fr_0.8fr_0.8fr_0.9fr_1fr]";

function riscoTone(risco: number | null): Tone {
  if (risco == null) return "mut";
  if (risco < 30) return "ok";
  if (risco < 60) return "amber";
  return "danger";
}

function vencTone(vencimento: string | null, atrasado: boolean): Tone {
  if (atrasado) return "danger";
  if (!vencimento) return "mut";
  return "amber";
}

export default async function FinanceiroPage() {
  const supabase = createClient();

  const [{ data: recebimentos }, { data: assinaturas }] = await Promise.all([
    supabase
      .from("recebimentos")
      .select("*, clientes(nome, ramo)")
      .order("vencimento", { ascending: true }),
    supabase
      .from("assinaturas")
      .select("*, clientes(nome)")
      .order("created_at", { ascending: true }),
  ]);

  const mrr = (assinaturas ?? [])
    .filter((a) => a.status === "ativa")
    .reduce((sum, a) => sum + Number(a.valor), 0);
  const ativas = (assinaturas ?? []).filter((a) => a.status === "ativa").length;
  const retry = (assinaturas ?? []).find((a) => a.status === "retry");
  const inadimplente = (assinaturas ?? [])
    .filter((a) => a.status === "inadimplente")
    .sort((a, b) => (b.churn_score ?? 0) - (a.churn_score ?? 0))[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Financeiro</h1>
        <span className="rounded-full border border-line bg-card px-2.5 py-[3px] text-[10.5px] font-semibold text-mut">
          R$ · US$ · €
        </span>
      </div>

      {/* Previsão de caixa + Lucro por cliente */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.5fr_1fr]">
        <div className={`${card} px-3.5 py-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[12.5px] text-ink">Previsão de caixa · 90 dias</b>
            <IaBadge>IA · 3 CENÁRIOS</IaBadge>
            <span className="ml-auto flex gap-3 text-[10.5px] text-mut">
              <span className="text-ok">┅ otimista</span>
              <span className="text-brand">— base</span>
              <span className="text-danger">┅ pessimista</span>
            </span>
          </div>
          <svg width="100%" height="130" viewBox="0 0 480 130" preserveAspectRatio="none" className="mt-2">
            <line x1="0" y1="65" x2="480" y2="65" stroke="#DCE4F0" strokeDasharray="2 4" />
            <line x1="0" y1="110" x2="480" y2="110" stroke="#DCE4F0" />
            <path d="M0,70 L120,58 L240,40 L360,26 L480,12" fill="none" stroke="#0E9F6E" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />
            <path d="M0,70 L120,64 L240,54 L360,48 L480,40" fill="none" stroke="#1D5BFF" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M0,70 L120,64 L240,54 L360,48 L480,40 L480,110 L0,110 Z" fill="rgba(29,91,255,.06)" />
            <path d="M0,70 L120,74 L240,82 L360,92 L480,104" fill="none" stroke="#E5484D" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-mut">
            <span>hoje</span>
            <span>30d</span>
            <span>60d</span>
            <span>90d</span>
          </div>
          <div className="mt-1.5 text-[11px] text-mut">
            Cenário base em 90 dias: <b className="text-ink">R$ 24.700</b> · pessimista não fica negativo
          </div>
        </div>

        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[12.5px] text-ink">Lucro por cliente · últimos 6 meses</b>
          <div className="mt-3 flex flex-col gap-2.5">
            {lucroCliente.map((l) => (
              <div key={l.nome} className="grid grid-cols-[64px_1fr_58px] items-center gap-2 text-[11.5px]">
                <span>{l.nome}</span>
                <div className="h-3 overflow-hidden rounded-full bg-soft">
                  <div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: l.fill }} />
                </div>
                <b className={l.danger ? "text-danger" : "text-ink"}>{l.valor}</b>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-dashed border-line pt-2.5 text-[11.5px] text-mut">
            <b className="text-ia">IA:</b> Lex consome 11% das suas horas e gera 2% do lucro — considere reajuste ou encerramento.
          </div>
        </div>
      </div>

      {/* Contas a receber */}
      <div className={`${card} overflow-hidden`}>
        <div className="thin-scroll overflow-x-auto">
          <div className="min-w-[720px]">
            <div className={`grid ${recCols} gap-2 border-b border-line bg-soft px-3.5 py-2.5 text-[10px] font-semibold tracking-[0.07em] text-mut`}>
              <span>CONTAS A RECEBER</span>
              <span>VALOR</span>
              <span>VENCIMENTO</span>
              <span>RISCO · IA</span>
              <span />
            </div>
            {!recebimentos?.length && (
              <div className="px-3.5 py-8 text-center text-[12.5px] text-mut">Nenhuma conta a receber cadastrada.</div>
            )}
            {recebimentos?.map((r) => {
              const nome = r.clientes?.nome ?? "Cliente";
              const atrasado = r.status === "atrasado";
              const jaPago = r.status === "pago";
              return (
                <div
                  key={r.id}
                  className={`grid ${recCols} items-center gap-2 border-b border-line px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-soft`}
                >
                  <div>
                    <b className="text-[12.5px] text-ink">{nome}</b>
                    <div className="text-[11px] text-mut">{r.descricao ?? r.clientes?.ramo}</div>
                  </div>
                  <b className="text-[12.5px] text-ink">{formatMoney(Number(r.valor), r.moeda)}</b>
                  <span className={`text-[11.5px] font-semibold ${toneText[vencTone(r.vencimento, atrasado)]}`}>
                    {atrasado ? `${Math.abs(diffOrZero(r.vencimento))} dias atrás` : relativeDate(r.vencimento)}
                  </span>
                  <span>
                    <span className={`rounded-full border px-[9px] py-0.5 text-[10.5px] font-bold ${riskPill[riscoTone(r.risco_ia)]}`}>
                      {riscoTone(r.risco_ia) === "ok" ? "baixo" : riscoTone(r.risco_ia) === "amber" ? "médio" : "alto"} · {r.risco_ia ?? 0}%
                    </span>
                  </span>
                  {r.cliente_id && !jaPago ? (
                    <AiDraftButton
                      spec={{ tipo: "cobranca", clienteId: r.cliente_id, recebimentoId: r.id }}
                      fallbackTitle={`Cobrança — ${nome}`}
                      label={atrasado ? "Cobrança IA" : "Enviar lembrete"}
                      solid={atrasado}
                      className="justify-self-end"
                    />
                  ) : (
                    <span className="justify-self-end text-[11px] text-mut">em dia</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assinaturas recorrentes (Asaas) */}
      <div className={`${card} px-3.5 py-3`}>
        <div className="flex items-center gap-2">
          <b className="text-[12.5px] text-ink">Assinaturas recorrentes</b>
          <span className="rounded-full border border-line bg-soft px-2.5 py-0.5 text-[10.5px] font-semibold text-mut">
            integrado ao Asaas
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-[10px] border border-line bg-soft px-3 py-2.5">
            <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">MRR</div>
            <div className="mt-0.5 text-[17px] font-extrabold text-ink">{formatMoney(mrr)}</div>
            <div className="mt-0.5 text-[11px] font-semibold text-ok">receita recorrente ativa</div>
          </div>
          <div className="rounded-[10px] border border-line bg-soft px-3 py-2.5">
            <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">ASSINATURAS ATIVAS</div>
            <div className="mt-0.5 text-[17px] font-extrabold text-ink">{ativas}</div>
            <div className="mt-0.5 text-[11px] text-mut">manutenção + suporte</div>
          </div>
          <div className="rounded-[10px] border border-line bg-soft px-3 py-2.5">
            <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">RETRY DE CARTÃO</div>
            <div className="mt-0.5 text-[17px] font-extrabold text-warn">{retry ? 1 : 0}</div>
            <div className="mt-0.5 text-[11px] text-mut">
              {retry ? `${retry.clientes?.nome} · cartão recusado` : "nenhum pendente"}
            </div>
          </div>
          <div className="rounded-[10px] border border-line bg-soft px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold tracking-[0.07em] text-mut">CHURN PREVISTO</span>
              <IaBadge className="px-1.5 py-px text-[9px]" />
            </div>
            <div className="mt-0.5 text-[17px] font-extrabold text-danger">{inadimplente ? 1 : 0}</div>
            <div className="mt-0.5 text-[11px] text-mut">
              {inadimplente ? `${inadimplente.clientes?.nome} · ${inadimplente.churn_score}% de chance em 60d` : "nenhum em risco"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function diffOrZero(vencimento: string | null) {
  if (!vencimento) return 0;
  const d = new Date(vencimento + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}
