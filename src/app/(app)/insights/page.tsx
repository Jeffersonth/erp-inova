import { Suspense } from "react";
import { IaBadge } from "@/components/ia-badge";
import { RichText } from "@/components/rich-text";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import {
  previsaoReceita,
  lucroPorCliente,
  projetosEmRisco,
  inadimplencia,
  type RecebimentoLike,
} from "@/lib/insights";
import { gerarAnaliseInsights, type NarrativaInput } from "@/lib/ai/insights-narrativa";

const card = "rounded-xl border border-line bg-card";

function riscoTone(r: number) {
  if (r >= 60) return { txt: "text-danger", bg: "#E5484D" };
  if (r >= 35) return { txt: "text-warn", bg: "#C77700" };
  return { txt: "text-ok", bg: "#0E9F6E" };
}

async function AnaliseIA(props: NarrativaInput) {
  const texto = await gerarAnaliseInsights(props);
  return <RichText text={texto} />;
}

export default async function InsightsPage() {
  const supabase = createClient();

  const [{ data: clientes }, { data: projetos }, { data: recebimentos }, { data: custos }, { data: assinaturas }] =
    await Promise.all([
      supabase.from("clientes").select("id, nome"),
      supabase.from("projetos").select("id, titulo, status, progresso, data_entrega"),
      supabase
        .from("recebimentos")
        .select("cliente_id, valor, valor_pago, moeda, status, vencimento, data_pagamento, clientes(nome)"),
      supabase.from("custos").select("cliente_id, valor"),
      supabase.from("assinaturas").select("valor, status"),
    ]);

  const recs = (recebimentos ?? []) as (RecebimentoLike & { clientes?: { nome: string } | null })[];
  const prev = previsaoReceita(recs, assinaturas ?? []);
  const lucros = lucroPorCliente(clientes ?? [], recs, custos ?? []);
  const riscosProj = projetosEmRisco(projetos ?? []);
  const contas = inadimplencia(recs);

  const maiorPrev = Math.max(prev.otimista, 1);
  const cenarios = [
    { label: "Otimista", v: prev.otimista, cor: "#0E9F6E" },
    { label: "Base", v: prev.base, cor: "#1D5BFF" },
    { label: "Pessimista", v: prev.pessimista, cor: "#E5484D" },
  ];

  const lucroTop = lucros[0];
  const lucroPior = lucros.length > 1 ? lucros[lucros.length - 1] : null;
  const projRisco = riscosProj.find((p) => p.risco >= 35) ?? null;
  const contaTop = contas[0] ?? null;

  const narrativa: NarrativaInput = {
    previsaoBase: formatMoney(prev.base),
    previsaoOtimista: formatMoney(prev.otimista),
    previsaoPessimista: formatMoney(prev.pessimista),
    mrr: formatMoney(prev.mrr),
    saldoAberto: formatMoney(prev.saldoAberto),
    lucroTop: lucroTop ? { nome: lucroTop.nome, lucro: formatMoney(lucroTop.lucro) } : null,
    clienteRisco: lucroPior && lucroPior.lucro < 0 ? { nome: lucroPior.nome, lucro: formatMoney(lucroPior.lucro) } : null,
    projetoRisco: projRisco ? { titulo: projRisco.titulo, risco: projRisco.risco } : null,
    contaRisco: contaTop ? { cliente: contaTop.clienteNome, saldo: formatMoney(contaTop.saldo, contaTop.moeda as Enums<"moeda">), risco: contaTop.risco } : null,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Insights</h1>
        <span className="text-[11.5px] text-mut">previsões e análises a partir dos seus dados reais</span>
      </div>

      {/* Análise da IA */}
      <div className="flex items-start gap-3 rounded-xl border border-aqua/35 bg-gradient-to-r from-aqua/10 to-brand/[0.06] px-3.5 py-[11px]">
        <IaBadge className="mt-px" />
        <div className="min-w-0 text-[12.5px] leading-[1.55] text-ink">
          <Suspense fallback={<span className="text-mut">Analisando seus números…</span>}>
            <AnaliseIA {...narrativa} />
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.3fr_1fr]">
        {/* Previsão de receita */}
        <div className={`${card} px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[12.5px] text-ink">Previsão de receita · 90 dias</b>
            <IaBadge>3 CENÁRIOS</IaBadge>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {cenarios.map((c) => (
              <div key={c.label} className="grid grid-cols-[70px_1fr_92px] items-center gap-2 text-[11.5px]">
                <span className="text-mut">{c.label}</span>
                <div className="h-3 overflow-hidden rounded-full bg-soft">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((c.v / maiorPrev) * 100)}%`, background: c.cor }} />
                </div>
                <b className="text-right text-ink">{formatMoney(c.v)}</b>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-line pt-2.5 text-[11px] text-mut">
            <span>MRR recorrente: <b className="text-ink">{formatMoney(prev.mrr)}</b></span>
            <span>Saldo em aberto: <b className="text-ink">{formatMoney(prev.saldoAberto)}</b></span>
            <span>Média mensal (3m): <b className="text-ink">{formatMoney(Math.round(prev.mediaMensal))}</b></span>
          </div>
        </div>

        {/* Lucro por cliente */}
        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[12.5px] text-ink">Lucro por cliente</b>
          {lucros.length === 0 ? (
            <div className="mt-3 text-[12px] text-mut">Sem dados suficientes ainda — registre vendas e despesas por cliente.</div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {lucros.slice(0, 6).map((l) => (
                <div key={l.clienteId} className="grid grid-cols-[1fr_64px_54px] items-center gap-2 text-[11.5px]">
                  <span className="truncate text-ink">{l.nome}</span>
                  <b className={`text-right ${l.lucro >= 0 ? "text-ok" : "text-danger"}`}>{formatMoney(l.lucro)}</b>
                  <span className="text-right text-mut">{l.margem}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {/* Projetos em risco de atraso */}
        <div className={`${card} px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[12.5px] text-ink">Risco de atraso · projetos</b>
            <IaBadge />
          </div>
          {riscosProj.length === 0 ? (
            <div className="mt-3 text-[12px] text-mut">Nenhum projeto ativo.</div>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              {riscosProj.slice(0, 5).map((p) => {
                const t = riscoTone(p.risco);
                return (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-ink">{p.titulo}</div>
                      <div className="truncate text-[10.5px] text-mut">{p.motivo}</div>
                    </div>
                    <div className="h-1.5 w-[70px] flex-none overflow-hidden rounded-full bg-soft">
                      <div className="h-full rounded-full" style={{ width: `${p.risco}%`, background: t.bg }} />
                    </div>
                    <b className={`w-[38px] flex-none text-right text-[11.5px] ${t.txt}`}>{p.risco}%</b>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Risco de inadimplência */}
        <div className={`${card} px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[12.5px] text-ink">Risco de inadimplência · contas</b>
            <IaBadge />
          </div>
          {contas.length === 0 ? (
            <div className="mt-3 text-[12px] text-mut">Nenhuma conta em aberto. 🎉</div>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              {contas.slice(0, 5).map((c, i) => {
                const t = riscoTone(c.risco);
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-ink">{c.clienteNome}</div>
                      <div className="truncate text-[10.5px] text-mut">
                        {formatMoney(c.saldo, c.moeda as Enums<"moeda">)}
                        {c.diasAtraso > 0 ? ` · ${c.diasAtraso} dia(s) em atraso` : " · em aberto"}
                      </div>
                    </div>
                    <b className={`w-[38px] flex-none text-right text-[11.5px] ${t.txt}`}>{c.risco}%</b>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
