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
