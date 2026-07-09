import Link from "next/link";
import { IaBadge } from "@/components/ia-badge";
import { DraftButton } from "@/components/draft-button";
import { RichText } from "@/components/rich-text";
import { toneText } from "@/lib/tone";
import { kpis, funil, projetosConcluidos, atencao } from "@/lib/mock-data";

const card = "rounded-xl border border-line bg-card";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Dashboard</h1>
        <span className="text-[11.5px] text-mut">terça, 8 de julho</span>
        <button className="ml-auto rounded-lg bg-brand px-3.5 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark">
          + Novo
        </button>
      </div>

      {/* Resumo do dia (IA) */}
      <div className="flex items-start gap-3 rounded-xl border border-aqua/35 bg-gradient-to-r from-aqua/10 to-brand/[0.06] px-3.5 py-[11px]">
        <IaBadge className="mt-px" />
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold text-ink">Bom dia, Rafael. Hoje pede atenção ao caixa.</div>
          <div className="mt-0.5 text-[12px] text-mut">
            Você tem <b className="text-ink">2 entregas</b> esta semana, <b className="text-ink">R$ 6,3k a receber</b> em 7 dias e a proposta da Nordic AS está <b className="text-ink">5 dias sem resposta</b> — sugeri um follow-up abaixo.
          </div>
        </div>
        <Link
          href="/assistente"
          className="ml-auto flex-none rounded-lg border border-line px-2.5 py-[5px] text-[11.5px] font-semibold text-ink transition-colors hover:border-aqua"
        >
          Abrir assistente
        </Link>
      </div>

      {/* Anomalia */}
      <div className="flex items-center gap-2.5 rounded-xl border border-line border-l-[3px] border-l-warn bg-card px-3.5 py-2.5">
        <span className="text-[15px]">⚠</span>
        <div className="min-w-0 text-[12px]">
          <b className="text-[12.5px] text-ink">Anomalia detectada:</b>{" "}
          <span className="text-mut">gasto com &ldquo;Ferramentas &amp; SaaS&rdquo; está 3,2× acima da média (R$ 918 vs R$ 287/mês).</span>
        </div>
        <IaBadge className="ml-auto" />
        <DraftButton draftKey="anomalia" label="Revisar" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`${card} cursor-pointer px-3 py-2.5 transition-colors hover:border-brand`}
          >
            <div className="text-[10px] font-semibold tracking-[0.07em] text-mut">{k.label}</div>
            <div className="mt-0.5 text-[18px] font-extrabold tracking-[-0.02em] text-ink">{k.value}</div>
            <div className={`mt-0.5 text-[11px] font-semibold ${toneText[k.tone]}`}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {/* Receita mensal */}
        <div className={`${card} px-3.5 py-3`}>
          <div className="flex items-center gap-2">
            <b className="text-[12.5px] text-ink">Receita mensal</b>
            <span className="text-[10.5px] font-semibold text-ia">previsão IA ┅</span>
          </div>
          <svg width="100%" height="110" viewBox="0 0 440 110" preserveAspectRatio="none" className="mt-2">
            <line x1="0" y1="90" x2="440" y2="90" stroke="#DCE4F0" />
            <line x1="0" y1="50" x2="440" y2="50" stroke="#DCE4F0" strokeDasharray="2 4" />
            <path d="M0,78 L62,70 L124,74 L186,58 L248,46 L290,40" fill="none" stroke="#1D5BFF" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M0,78 L62,70 L124,74 L186,58 L248,46 L290,40 L290,90 L0,90 Z" fill="rgba(29,91,255,.07)" />
            <path d="M290,40 L350,34 L440,22" fill="none" stroke="#00D1FF" strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
            <circle cx="290" cy="40" r="3.5" fill="#1D5BFF" />
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-mut">
            {["fev", "mar", "abr", "mai", "jun", "jul", "ago*", "set*"].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>

        {/* Funil de leads */}
        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[12.5px] text-ink">Funil de leads</b>
          <div className="mt-2.5 flex flex-col gap-[7px]">
            {funil.map((f) => (
              <div key={f.name} className="grid grid-cols-[78px_1fr_34px] items-center gap-2 text-[11.5px]">
                <span className="text-mut">{f.name}</span>
                <div className="h-3.5 rounded" style={{ width: `${f.width}%`, background: f.fill }} />
                <b className="text-ink">{f.value}</b>
              </div>
            ))}
          </div>
          <div className="mt-2.5 text-[11px] text-mut">
            Conversão contato → fechado: <b className="text-ink">17%</b>
          </div>
        </div>

        {/* Projetos concluídos */}
        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[12.5px] text-ink">Projetos concluídos</b>
          <div className="mt-2.5 flex h-[84px] items-end gap-3.5 px-1">
            {projetosConcluidos.map((p) => (
              <div key={p.mes} className="flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${p.h}%`, background: p.on ? "#1D5BFF" : "rgba(29,91,255,.3)" }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between px-1 text-[10px] text-mut">
            {projetosConcluidos.map((p) => (
              <span key={p.mes}>{p.mes}</span>
            ))}
          </div>
        </div>

        {/* Fluxo de caixa */}
        <div className={`${card} px-3.5 py-3`}>
          <b className="text-[12.5px] text-ink">Fluxo de caixa · 30 dias</b>
          <svg width="100%" height="84" viewBox="0 0 440 84" preserveAspectRatio="none" className="mt-2.5">
            <line x1="0" y1="42" x2="440" y2="42" stroke="#DCE4F0" />
            <path d="M0,38 L55,20 L110,48 L165,30 L220,56 L275,26 L330,50 L385,34 L440,18" fill="none" stroke="#0E9F6E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="440" cy="18" r="3.5" fill="#0E9F6E" />
          </svg>
          <div className="mt-1.5 text-[11px] text-mut">
            Saldo projetado 08/ago: <b className="text-ok">+ R$ 11.980</b>
          </div>
        </div>
      </div>

      {/* Atenção necessária */}
      <div className={`${card} px-3.5 py-3`}>
        <div className="flex items-center gap-2">
          <b className="text-[12.5px] text-ink">Atenção necessária</b>
          <span className="text-[11px] text-mut">priorizado por impacto financeiro</span>
          <IaBadge />
        </div>
        <div className="mt-2 flex flex-col">
          {atencao.map((a, i) => (
            <div key={i} className="flex items-center gap-2.5 border-t border-line py-2">
              <span className="flex-none rounded-md border border-line bg-soft px-2 py-[3px] text-[11px] font-bold text-ink">
                {a.valor}
              </span>
              <span className="text-[12.5px] text-ink">
                <RichText text={a.text} />
              </span>
              {a.ia && <IaBadge />}
              {a.action.kind === "draft" ? (
                <DraftButton
                  className="ml-auto"
                  draftKey={a.action.key}
                  label={a.action.label}
                  solid={a.action.solid}
                />
              ) : (
                <Link
                  href={a.action.href}
                  className="ml-auto flex-none rounded-lg border border-line px-3 py-[5px] text-[11.5px] font-semibold text-ink transition-colors hover:border-brand"
                >
                  {a.action.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
