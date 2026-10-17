import Link from "next/link";
import { ProspeccaoDaily } from "@/components/prospeccao-daily";
import { ProspeccaoPipeline } from "@/components/prospeccao-pipeline";
import { normalizarRegistros, canalLabel, type ConversaLead } from "@/lib/prospeccao";
import { agendaDate } from "@/lib/agenda-items";
import { Suspense } from "react";
import { LeadsBoard } from "@/components/leads-board";
import { RichText } from "@/components/rich-text";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { totais, insightsLeads, type LeadCanal, type LeadMeta, type LeadRegistro } from "@/lib/leads";
import { gerarAnaliseLeads, type LeadsNarrativaInput } from "@/lib/ai/leads-narrativa";

async function AnaliseLeadsIA(props: LeadsNarrativaInput) {
  const texto = await gerarAnaliseLeads(props);
  return <RichText text={texto} />;
}

export default async function ProspeccaoPage({ searchParams }: { searchParams: { aba?: string } }) {
  const supabase = createClient();

  const hoje = new Date(agendaDate() + "T12:00:00-03:00");
  const mesInicioIso = agendaDate().slice(0, 7) + "-01";

  const [{ data: canais, error: canaisError }, { data: registros, error: registrosError }, { data: metas }, { data: conversas, error: conversasError }] = await Promise.all([
    supabase.from("leads_canais").select("id, nome, ordem").order("ordem"),
    supabase
      .from("leads_registros")
      .select("id, canal_id, data, contatos, respostas, propostas, vendas, valor_vendido, observacoes")
      .order("data", { ascending: false }),
    supabase
      .from("leads_metas")
      .select("id, canal_id, titulo, metrica, alvo, atual_manual, mes")
      .eq("mes", mesInicioIso)
      .order("created_at"),
    supabase.from("prospeccao_leads").select("id,nome,contato,email,telefone,canal_id,status,notas,ultimo_contato,proximo_contato,valor_potencial,cliente_id").order("created_at", { ascending: false }),
  ]);

  const canaisList = ((canais ?? []) as LeadCanal[]).map(c => ({ ...c, nome: canalLabel(c.nome) }));
  const regs = normalizarRegistros((registros ?? []) as LeadRegistro[], canaisList);

  // Narrativa da IA (Opus) sobre o mês atual + achados determinísticos
  const regsMes = regs.filter((r) => r.data.startsWith(mesInicioIso.slice(0, 7)));
  const totMes = totais(regsMes);
  const achados = insightsLeads(regs, canaisList, hoje);
  const narrativa: LeadsNarrativaInput = {
    mesLabel: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(hoje),
    contatos: totMes.contatos,
    respostas: totMes.respostas,
    propostas: totMes.propostas,
    vendas: totMes.vendas,
    receita: formatMoney(totMes.receita),
    taxaResposta: totMes.taxaResposta,
    taxaConversao: totMes.taxaConversao,
    achados: achados.map((a) => a.texto.replace(/\*\*/g, "")),
  };

  return (
    <div className="space-y-5">
      <header><h1 className="text-2xl font-extrabold text-ink">Prospecção</h1><p className="mt-1 text-sm text-mut">Acompanhe seus esforços, as respostas e as próximas oportunidades.</p></header>
      <nav aria-label="Áreas da prospecção" className="flex gap-2 border-b border-line pb-3">
        {[{label:"Prospecção",href:"/prospeccao",active:searchParams.aba!=="leads"},{label:"Leads",href:"/prospeccao?aba=leads",active:searchParams.aba==="leads"}].map(t=><Link key={t.label} href={t.href} aria-current={t.active?"page":undefined} className={`rounded-lg px-4 py-2 text-sm font-semibold ${t.active?"bg-brand text-white":"bg-soft text-mut hover:text-brand"}`}>{t.label}</Link>)}
      </nav>
      {(canaisError || registrosError || conversasError) ? <p role="alert" className="erp-card p-6 text-sm text-danger">Não foi possível carregar a prospecção. Atualize a página para tentar novamente.</p> : searchParams.aba === "leads" ? <ProspeccaoPipeline canais={canaisList} leads={(conversas??[]) as ConversaLead[]} /> : <>
      <ProspeccaoDaily canais={canaisList} />
      <LeadsBoard
      canais={canaisList}
      registrosInicial={regs}
      metasInicial={(metas ?? []) as LeadMeta[]}
      mesInicioIso={mesInicioIso}
      analiseIa={
        <Suspense fallback={<span className="text-mut">Analisando sua prospecção…</span>}>
          <AnaliseLeadsIA {...narrativa} />
        </Suspense>
      }
    />
      </>}
    </div>
  );
}
