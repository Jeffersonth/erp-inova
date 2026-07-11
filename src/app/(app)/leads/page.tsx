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

export default async function LeadsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoje = new Date();
  const mesInicioIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: canais }, { data: registros }, { data: metas }] = await Promise.all([
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
  ]);

  const canaisList = (canais ?? []) as LeadCanal[];
  const regs = (registros ?? []) as LeadRegistro[];

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
    <LeadsBoard
      userId={user?.id ?? ""}
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
  );
}
