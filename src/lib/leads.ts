// Módulo Leads — agregações e indicadores de prospecção.
// Funções puras (rodam no server e no client) sobre os registros diários.

export type LeadCanal = { id: string; nome: string; ordem: number };

export type LeadRegistro = {
  id: string;
  canal_id: string;
  data: string; // YYYY-MM-DD
  contatos: number;
  respostas: number;
  propostas: number;
  vendas: number;
  valor_vendido: number;
  observacoes: string | null;
};

export type Totais = {
  contatos: number;
  respostas: number;
  propostas: number;
  vendas: number;
  receita: number;
  taxaResposta: number; // %
  taxaConversao: number; // % contatos -> vendas
  ticketMedio: number;
};

const pct = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 1000) / 10 : 0);

export function totais(regs: LeadRegistro[]): Totais {
  const t = regs.reduce(
    (a, r) => ({
      contatos: a.contatos + r.contatos,
      respostas: a.respostas + r.respostas,
      propostas: a.propostas + r.propostas,
      vendas: a.vendas + r.vendas,
      receita: a.receita + Number(r.valor_vendido),
    }),
    { contatos: 0, respostas: 0, propostas: 0, vendas: 0, receita: 0 },
  );
  return {
    ...t,
    taxaResposta: pct(t.respostas, t.contatos),
    taxaConversao: pct(t.vendas, t.contatos),
    ticketMedio: t.vendas > 0 ? Math.round(t.receita / t.vendas) : 0,
  };
}

export type CanalStats = Totais & { canalId: string; nome: string };

export function porCanal(regs: LeadRegistro[], canais: LeadCanal[]): CanalStats[] {
  return canais
    .map((c) => ({ canalId: c.id, nome: c.nome, ...totais(regs.filter((r) => r.canal_id === c.id)) }))
    .filter((c) => c.contatos > 0 || c.vendas > 0 || c.receita > 0);
}

export type Ranking = {
  maiorReceita: CanalStats | null;
  maiorTaxaResposta: CanalStats | null;
  maiorConversao: CanalStats | null;
  maisContatos: CanalStats | null;
};

export function ranking(stats: CanalStats[]): Ranking {
  const by = (f: (c: CanalStats) => number, filtro?: (c: CanalStats) => boolean) => {
    const list = (filtro ? stats.filter(filtro) : stats).slice().sort((a, b) => f(b) - f(a));
    return list[0] && f(list[0]) > 0 ? list[0] : null;
  };
  return {
    maiorReceita: by((c) => c.receita),
    maiorTaxaResposta: by((c) => c.taxaResposta, (c) => c.contatos >= 5),
    maiorConversao: by((c) => c.taxaConversao, (c) => c.contatos >= 5),
    maisContatos: by((c) => c.contatos),
  };
}

/** Série diária preenchida (dias sem registro = zeros). ini/fim = YYYY-MM-DD inclusivos. */
export function porDia(regs: LeadRegistro[], ini: string, fim: string) {
  const mapa = new Map<string, { contatos: number; respostas: number; propostas: number; vendas: number; receita: number }>();
  for (const r of regs) {
    if (r.data < ini || r.data > fim) continue;
    const atual = mapa.get(r.data) ?? { contatos: 0, respostas: 0, propostas: 0, vendas: 0, receita: 0 };
    atual.contatos += r.contatos;
    atual.respostas += r.respostas;
    atual.propostas += r.propostas;
    atual.vendas += r.vendas;
    atual.receita += Number(r.valor_vendido);
    mapa.set(r.data, atual);
  }
  const dias: ({ data: string } & NonNullable<ReturnType<typeof mapa.get>>)[] = [];
  const d = new Date(ini + "T00:00:00");
  const end = new Date(fim + "T00:00:00");
  while (d <= end) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dias.push({ data: iso, ...(mapa.get(iso) ?? { contatos: 0, respostas: 0, propostas: 0, vendas: 0, receita: 0 }) });
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

/** Últimos N meses (mais antigo primeiro) com totais por mês. */
export function porMes(regs: LeadRegistro[], nMeses: number, ref = new Date()) {
  const meses: { label: string; iso: string; contatos: number; respostas: number; vendas: number; receita: number }[] = [];
  for (let i = nMeses - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.push({
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d).replace(".", ""),
      iso,
      contatos: 0,
      respostas: 0,
      vendas: 0,
      receita: 0,
    });
  }
  const idx = new Map(meses.map((m, i) => [m.iso, i]));
  for (const r of regs) {
    const i = idx.get(r.data.slice(0, 7));
    if (i === undefined) continue;
    meses[i].contatos += r.contatos;
    meses[i].respostas += r.respostas;
    meses[i].vendas += r.vendas;
    meses[i].receita += Number(r.valor_vendido);
  }
  return meses;
}

export type LeadMetaMetrica = "contatos" | "respostas" | "propostas" | "vendas" | "receita" | "manual";

export type LeadMeta = {
  id: string;
  canal_id: string | null;
  titulo: string;
  metrica: LeadMetaMetrica;
  alvo: number;
  atual_manual: number;
  mes: string; // YYYY-MM-01
};

export const METRICA_LABEL: Record<LeadMetaMetrica, string> = {
  contatos: "Contatos",
  respostas: "Respostas",
  propostas: "Propostas",
  vendas: "Vendas",
  receita: "Receita (R$)",
  manual: "Manual (ex: sites, IA, dashboards)",
};

/** Valor atual da meta — automático a partir dos registros do mês, ou manual. */
export function progressoMeta(meta: LeadMeta, regs: LeadRegistro[]): number {
  if (meta.metrica === "manual") return Number(meta.atual_manual);
  const prefixo = meta.mes.slice(0, 7);
  const doMes = regs.filter((r) => r.data.startsWith(prefixo) && (!meta.canal_id || r.canal_id === meta.canal_id));
  const t = totais(doMes);
  if (meta.metrica === "receita") return t.receita;
  return t[meta.metrica];
}

/* ------------------------------------------------------------------ */
/* Insights Inteligentes — achados determinísticos sobre o histórico   */
/* ------------------------------------------------------------------ */
export type LeadInsight = { texto: string; tone: "ok" | "warn" | "brand" };

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function insightsLeads(regs: LeadRegistro[], canais: LeadCanal[], hoje = new Date()): LeadInsight[] {
  const achados: LeadInsight[] = [];
  if (regs.length === 0) return achados;

  const geral = totais(regs);
  const stats = porCanal(regs, canais);
  const mesPrefixo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  // 1) canal com taxa de resposta acima da média geral
  const comVolume = stats.filter((c) => c.contatos >= 5);
  const melhorResposta = comVolume.slice().sort((a, b) => b.taxaResposta - a.taxaResposta)[0];
  if (melhorResposta && geral.taxaResposta > 0 && melhorResposta.taxaResposta > geral.taxaResposta) {
    achados.push({
      tone: "ok",
      texto: `Suas campanhas de **${melhorResposta.nome}** têm taxa de resposta de **${melhorResposta.taxaResposta}%**, acima da média geral de ${geral.taxaResposta}%.`,
    });
  }

  // 2) canal que gera menos leads mas converte melhor
  if (comVolume.length >= 2) {
    const mediaContatos = comVolume.reduce((s, c) => s + c.contatos, 0) / comVolume.length;
    const eficiente = comVolume
      .filter((c) => c.contatos < mediaContatos && c.taxaConversao > geral.taxaConversao && c.vendas > 0)
      .sort((a, b) => b.taxaConversao - a.taxaConversao)[0];
    if (eficiente) {
      achados.push({
        tone: "brand",
        texto: `O **${eficiente.nome}** gera menos leads, mas tem a maior taxa de conversão (**${eficiente.taxaConversao}%**) — vale investir mais nele.`,
      });
    }
  }

  // 3) participação no faturamento do mês atual
  const regsMes = regs.filter((r) => r.data.startsWith(mesPrefixo));
  const receitaMes = regsMes.reduce((s, r) => s + Number(r.valor_vendido), 0);
  if (receitaMes > 0) {
    const topMes = porCanal(regsMes, canais).sort((a, b) => b.receita - a.receita)[0];
    if (topMes && topMes.receita > 0) {
      const parte = Math.round((topMes.receita / receitaMes) * 100);
      if (parte >= 30) {
        achados.push({
          tone: "brand",
          texto: `**${topMes.nome}** foi responsável por **${parte}%** do faturamento deste mês.`,
        });
      }
    }
  }

  // 4) melhor dia da semana pela taxa de resposta (precisa de volume mínimo)
  const porDiaSemana = Array.from({ length: 7 }, () => ({ contatos: 0, respostas: 0 }));
  for (const r of regs) {
    const dow = new Date(r.data + "T00:00:00").getDay();
    porDiaSemana[dow].contatos += r.contatos;
    porDiaSemana[dow].respostas += r.respostas;
  }
  const diasValidos = porDiaSemana
    .map((d, i) => ({ dia: i, ...d, taxa: d.contatos > 0 ? Math.round((d.respostas / d.contatos) * 1000) / 10 : 0 }))
    .filter((d) => d.contatos >= 10);
  if (diasValidos.length >= 2) {
    const melhorDia = diasValidos.slice().sort((a, b) => b.taxa - a.taxa)[0];
    const menosAtivo = diasValidos.slice().sort((a, b) => a.contatos - b.contatos)[0];
    if (melhorDia.taxa > 0) {
      achados.push(
        melhorDia.dia === menosAtivo.dia
          ? {
              tone: "brand",
              texto: `Você prospecta menos às **${DIAS_SEMANA[melhorDia.dia]}s**, mas é o dia com melhor taxa de resposta (**${melhorDia.taxa}%**).`,
            }
          : {
              tone: "brand",
              texto: `Seu melhor dia de prospecção é **${DIAS_SEMANA[melhorDia.dia]}** — taxa de resposta de **${melhorDia.taxa}%**.`,
            },
      );
    }
  }

  // 5) comparação de conversão entre os 2 maiores canais (últimos 3 meses)
  const ini3m = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  const ini3mIso = `${ini3m.getFullYear()}-${String(ini3m.getMonth() + 1).padStart(2, "0")}-01`;
  const stats3m = porCanal(regs.filter((r) => r.data >= ini3mIso), canais)
    .filter((c) => c.contatos >= 5)
    .sort((a, b) => b.contatos - a.contatos);
  if (stats3m.length >= 2) {
    const [a, b] = stats3m;
    const [melhor, pior] = a.taxaConversao >= b.taxaConversao ? [a, b] : [b, a];
    if (melhor.taxaConversao > pior.taxaConversao && melhor.vendas > 0) {
      achados.push({
        tone: "brand",
        texto: `Nos últimos 3 meses, **${melhor.nome}** converteu melhor que **${pior.nome}** (${melhor.taxaConversao}% vs ${pior.taxaConversao}%).`,
      });
    }
  }

  // 6) canal que parou de vender
  const hojeMs = hoje.getTime();
  for (const c of canais) {
    const doCanal = regs.filter((r) => r.canal_id === c.id && r.vendas > 0).sort((a, b) => b.data.localeCompare(a.data));
    if (doCanal.length === 0) continue;
    const dias = Math.round((hojeMs - new Date(doCanal[0].data + "T00:00:00").getTime()) / 86_400_000);
    if (dias >= 30) {
      achados.push({ tone: "warn", texto: `O canal **${c.nome}** não gera vendas há **${dias} dias**.` });
      break; // um alerta desse tipo basta
    }
  }

  // 7) tendência de contatos mês a mês
  const m = porMes(regs, 2, hoje);
  if (m.length === 2 && m[0].contatos > 0) {
    const delta = Math.round(((m[1].contatos - m[0].contatos) / m[0].contatos) * 100);
    if (Math.abs(delta) >= 20) {
      achados.push(
        delta > 0
          ? { tone: "ok", texto: `Seu volume de prospecção cresceu **${delta}%** vs o mês passado. Mantenha o ritmo.` }
          : { tone: "warn", texto: `Seu volume de prospecção caiu **${Math.abs(delta)}%** vs o mês passado — reserve blocos na agenda.` },
      );
    }
  }

  return achados.slice(0, 6);
}

export type FunilEtapa = { label: string; valor: number; pctDoTopo: number; pctEtapa: number | null };

export function funil(t: Totais): FunilEtapa[] {
  const etapas = [
    { label: "Contatos", valor: t.contatos },
    { label: "Respostas", valor: t.respostas },
    { label: "Propostas", valor: t.propostas },
    { label: "Vendas", valor: t.vendas },
  ];
  return etapas.map((e, i) => ({
    ...e,
    pctDoTopo: pct(e.valor, etapas[0].valor),
    pctEtapa: i === 0 ? null : pct(e.valor, etapas[i - 1].valor),
  }));
}
