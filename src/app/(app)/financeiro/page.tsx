import Link from "next/link";
import { IaBadge } from "@/components/ia-badge";
import { AiDraftButton } from "@/components/ai-draft-button";
import {
  NewRecebimentoDialog,
  EditRecebimentoButton,
} from "@/components/recebimento-dialogs";
import { NewCustoDialog, EditCustoButton } from "@/components/custo-dialogs";
import { toneText } from "@/lib/tone";
import { formatMoney, relativeDate } from "@/lib/format";
import { pagamentoInfo } from "@/lib/recebimento";
import { createClient } from "@/lib/supabase/server";

const card = "rounded-xl border border-line bg-card";
const recCols = "grid-cols-[1.7fr_0.9fr_0.9fr_0.9fr_0.8fr_0.9fr_0.7fr]";

export default async function FinanceiroPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoje = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const mesInicioIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const proxMesIso = `${proxMes.getFullYear()}-${String(proxMes.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: recebimentos }, { data: assinaturas }, { data: clientes }, { data: projetos }, { data: custos }, { data: metaRow }] =
    await Promise.all([
      supabase
        .from("recebimentos")
        .select("*, clientes(nome, ramo), projetos(titulo)")
        .order("data_pagamento", { ascending: false, nullsFirst: false }),
      supabase.from("assinaturas").select("*, clientes(nome)").order("created_at", { ascending: true }),
      supabase.from("clientes").select("id, nome").order("nome"),
      supabase.from("projetos").select("id, titulo, cliente_id").order("titulo"),
      supabase.from("custos").select("*, clientes(nome)").order("data", { ascending: false }),
      user
        ? supabase.from("metas_financeiras").select("valor_meta").eq("user_id", user.id).eq("mes", mesInicioIso).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const clientesList = clientes ?? [];
  const projetosList = projetos ?? [];

  const mrr = (assinaturas ?? [])
    .filter((a) => a.status === "ativa")
    .reduce((sum, a) => sum + Number(a.valor), 0);
  const ativas = (assinaturas ?? []).filter((a) => a.status === "ativa").length;
  const retry = (assinaturas ?? []).find((a) => a.status === "retry");
  const inadimplente = (assinaturas ?? [])
    .filter((a) => a.status === "inadimplente")
    .sort((a, b) => (b.churn_score ?? 0) - (a.churn_score ?? 0))[0];

  // Totais das vendas e despesas (em BRL, moeda base da visão)
  const brl = (recebimentos ?? []).filter((r) => r.moeda === "BRL");
  const recebido = brl.reduce((s, r) => s + Number(r.valor_pago), 0);
  const aReceber = brl.reduce((s, r) => s + Math.max(0, Number(r.valor) - Number(r.valor_pago)), 0);
  const despesas = (custos ?? []).reduce((s, c) => s + Number(c.valor), 0);
  const lucro = recebido - despesas;

  // Visão do dia (design mobile): receber hoje, pagar hoje e saldo previsto
  const receberHoje = brl
    .filter((r) => r.vencimento === hojeIso)
    .reduce((s, r) => s + Math.max(0, Number(r.valor) - Number(r.valor_pago)), 0);
  const pagarHoje = (custos ?? []).filter((c) => c.data === hojeIso).reduce((s, c) => s + Number(c.valor), 0);
  const saldoPrevisto = receberHoje - pagarHoje;

  // Meta mensal + projeção da IA (determinística)
  const meta = metaRow ? Number(metaRow.valor_meta) : 0;
  const recebidoMes = brl
    .filter((r) => r.data_pagamento && r.data_pagamento >= mesInicioIso && r.data_pagamento < proxMesIso)
    .reduce((s, r) => s + Number(r.valor_pago), 0);
  const pctMeta = meta > 0 ? Math.round((recebidoMes / meta) * 100) : 0;
  const contasEmAberto = brl.filter((r) => Number(r.valor) - Number(r.valor_pago) > 0).length;
  const pctSeReceber = meta > 0 ? Math.round(((recebidoMes + aReceber) / meta) * 100) : 0;
  const mesLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(hoje);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Financeiro</h1>
        <span className="rounded-full border border-line bg-card px-2.5 py-[3px] text-[10.5px] font-semibold text-mut">
          R$ · US$ · €
        </span>
        <NewRecebimentoDialog clientes={clientesList} projetos={projetosList} />
      </div>

      {/* Visão do dia (design mobile) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">RECEBER HOJE</div>
          <div className="mt-0.5 text-[17px] font-extrabold text-ok">{formatMoney(receberHoje)}</div>
        </div>
        <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">PAGAR HOJE</div>
          <div className="mt-0.5 text-[17px] font-extrabold text-danger">{formatMoney(pagarHoje)}</div>
        </div>
        <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">SALDO PREVISTO</div>
          <div className={`mt-0.5 text-[17px] font-extrabold ${saldoPrevisto >= 0 ? "text-ink" : "text-danger"}`}>
            {formatMoney(saldoPrevisto)}
          </div>
        </div>
        <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">MRR · ASAAS</div>
          <div className="mt-0.5 text-[17px] font-extrabold text-ink">{formatMoney(mrr)}</div>
        </div>
      </div>

      {/* Meta mensal */}
      <div className={`${card} px-3.5 py-3`}>
        {meta > 0 ? (
          <>
            <div className="flex items-center text-[11.5px] text-mut">
              <span>
                Meta mensal · <b className="text-ink">{formatMoney(meta)}</b>
              </span>
              <b className="ml-auto text-[12.5px] text-ink">{pctMeta}%</b>
            </div>
            <div className="mt-1.5 h-[9px] overflow-hidden rounded-full bg-soft">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, pctMeta)}%`, background: "linear-gradient(90deg,#1D5BFF,#00D1FF)" }}
              />
            </div>
            {aReceber > 0 && pctSeReceber > pctMeta && (
              <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-mut">
                <IaBadge className="px-1.5 py-px text-[9px]" />
                <span>
                  recebendo as {contasEmAberto} conta(s) em aberto, você atinge{" "}
                  <b className="text-ink">{pctSeReceber}% da meta</b>.
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-mut">
            Sem meta definida para {mesLabel} —
            <Link href="/dashboard" className="font-semibold text-brand hover:underline">
              defina no Painel
            </Link>
          </div>
        )}
      </div>

      {/* Resumo: receita, despesas e lucro */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">RECEBIDO · BRL</div>
          <div className="mt-0.5 text-[17px] font-extrabold text-ok">{formatMoney(recebido)}</div>
        </div>
        <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">A RECEBER · BRL</div>
          <div className="mt-0.5 text-[17px] font-extrabold text-warn">{formatMoney(aReceber)}</div>
        </div>
        <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">DESPESAS · BRL</div>
          <div className="mt-0.5 text-[17px] font-extrabold text-danger">{formatMoney(despesas)}</div>
        </div>
        <div className="rounded-[10px] border border-line bg-card px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">LUCRO · BRL</div>
          <div className={`mt-0.5 text-[17px] font-extrabold ${lucro >= 0 ? "text-ok" : "text-danger"}`}>
            {formatMoney(lucro)}
          </div>
        </div>
      </div>

      {/* Vendas / contas a receber */}
      <div className={`${card} overflow-hidden`}>
        <div className="thin-scroll overflow-x-auto">
          <div className="min-w-[860px]">
            <div className={`grid ${recCols} gap-2 border-b border-line bg-soft px-3.5 py-2.5 text-[10px] font-semibold tracking-[0.07em] text-mut`}>
              <span>VENDA</span>
              <span>VALOR</span>
              <span>PAGO</span>
              <span>SALDO</span>
              <span>STATUS</span>
              <span>DATA PAGTO</span>
              <span />
            </div>
            {!recebimentos?.length && (
              <div className="px-3.5 py-8 text-center text-[12.5px] text-mut">
                Nenhuma venda registrada. Clique em &ldquo;+ Nova venda&rdquo; para começar.
              </div>
            )}
            {recebimentos?.map((r) => {
              const nome = r.clientes?.nome ?? "Sem cliente";
              const info = pagamentoInfo(Number(r.valor), Number(r.valor_pago));
              const sub = r.projetos?.titulo ?? r.descricao ?? r.clientes?.ramo ?? "";
              return (
                <div
                  key={r.id}
                  className={`grid ${recCols} items-center gap-2 border-b border-line px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-soft`}
                >
                  <div className="min-w-0">
                    <b className="text-[12.5px] text-ink">{nome}</b>
                    {sub && <div className="truncate text-[11px] text-mut">{sub}</div>}
                  </div>
                  <b className="text-[12.5px] text-ink">{formatMoney(Number(r.valor), r.moeda)}</b>
                  <span className="text-[12px] text-ok">{formatMoney(Number(r.valor_pago), r.moeda)}</span>
                  <span className={`text-[12px] font-semibold ${info.saldo > 0 ? "text-warn" : "text-mut"}`}>
                    {formatMoney(info.saldo, r.moeda)}
                  </span>
                  <span className={`text-[11.5px] font-semibold ${toneText[info.tone]}`}>● {info.label}</span>
                  <span className="text-[11.5px] text-mut">{relativeDate(r.data_pagamento)}</span>
                  <div className="flex items-center justify-self-end gap-1.5">
                    {r.cliente_id && info.saldo > 0 && (
                      <AiDraftButton
                        spec={{ tipo: "cobranca", clienteId: r.cliente_id, recebimentoId: r.id }}
                        fallbackTitle={`Cobrança — ${nome}`}
                        label="Cobrar"
                        className="px-2.5 py-1 text-[11px]"
                      />
                    )}
                    <EditRecebimentoButton
                      recebimento={{
                        id: r.id,
                        clienteId: r.cliente_id,
                        projetoId: r.projeto_id,
                        descricao: r.descricao,
                        valor: Number(r.valor),
                        valorPago: Number(r.valor_pago),
                        moeda: r.moeda,
                        dataPagamento: r.data_pagamento,
                      }}
                      clientes={clientesList}
                      projetos={projetosList}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Despesas */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2 px-3.5 pt-3">
          <b className="text-[12.5px] text-ink">Despesas</b>
          <span className="text-[11px] text-mut">custos do negócio (BRL)</span>
          <div className="ml-auto">
            <NewCustoDialog clientes={clientesList} />
          </div>
        </div>
        <div className="thin-scroll mt-2 overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1.8fr_0.8fr_0.8fr_0.9fr_1fr_0.4fr] gap-2 border-b border-line bg-soft px-3.5 py-2.5 text-[10px] font-semibold tracking-[0.07em] text-mut">
              <span>DESPESA</span>
              <span>VALOR</span>
              <span>DATA</span>
              <span>TIPO</span>
              <span>CLIENTE</span>
              <span />
            </div>
            {!custos?.length && (
              <div className="px-3.5 py-6 text-center text-[12.5px] text-mut">
                Nenhuma despesa registrada.
              </div>
            )}
            {custos?.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[1.8fr_0.8fr_0.8fr_0.9fr_1fr_0.4fr] items-center gap-2 border-b border-line px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-soft"
              >
                <div className="min-w-0">
                  <b className="text-[12.5px] text-ink">{c.descricao ?? "Despesa"}</b>
                  {c.categoria && <div className="truncate text-[11px] text-mut">{c.categoria}</div>}
                </div>
                <b className="text-[12.5px] text-danger">{formatMoney(Number(c.valor))}</b>
                <span className="text-[11.5px] text-mut">{relativeDate(c.data)}</span>
                <span>
                  {c.recorrente ? (
                    <span className="rounded-full border border-warn/35 bg-warn/[0.08] px-2 py-[2px] text-[10.5px] font-semibold text-warn">
                      ⟳ recorrente
                    </span>
                  ) : (
                    <span className="rounded-full border border-line bg-soft px-2 py-[2px] text-[10.5px] font-semibold text-mut">
                      única
                    </span>
                  )}
                </span>
                <span className="truncate text-[11.5px] text-mut">{c.clientes?.nome ?? "—"}</span>
                <div className="justify-self-end">
                  <EditCustoButton
                    custo={{
                      id: c.id,
                      descricao: c.descricao,
                      categoria: c.categoria,
                      valor: Number(c.valor),
                      data: c.data,
                      recorrente: c.recorrente,
                      clienteId: c.cliente_id,
                    }}
                    clientes={clientesList}
                  />
                </div>
              </div>
            ))}
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
