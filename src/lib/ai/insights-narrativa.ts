import { anthropic, MODEL_STRONG } from "./client";

const SYSTEM = `Você é o analista financeiro do ERP Pessoal de um desenvolvedor freelancer.
A partir dos números fornecidos (todos reais, já calculados), escreva uma análise curta e prática em português (pt-BR):
- 2 a 4 frases de leitura da situação (receita, lucro, riscos).
- Depois, 2 ou 3 recomendações de ação objetivas, em bullets começando com "•".
Use os valores com destaque em **negrito markdown**. Não invente números além dos fornecidos. Seja direto, como um sócio que olhou os dados.`;

export type NarrativaInput = {
  previsaoBase: string;
  previsaoOtimista: string;
  previsaoPessimista: string;
  mrr: string;
  saldoAberto: string;
  lucroTop?: { nome: string; lucro: string } | null;
  clienteRisco?: { nome: string; lucro: string } | null;
  projetoRisco?: { titulo: string; risco: number } | null;
  contaRisco?: { cliente: string; saldo: string; risco: number } | null;
};

export async function gerarAnaliseInsights(input: NarrativaInput): Promise<string> {
  const linhas = [
    `Previsão de receita (90 dias): base ${input.previsaoBase}, otimista ${input.previsaoOtimista}, pessimista ${input.previsaoPessimista}.`,
    `MRR (recorrente ativo): ${input.mrr}. Saldo de vendas em aberto: ${input.saldoAberto}.`,
    input.lucroTop ? `Cliente mais lucrativo: ${input.lucroTop.nome} (${input.lucroTop.lucro}).` : "",
    input.clienteRisco ? `Cliente menos rentável: ${input.clienteRisco.nome} (${input.clienteRisco.lucro}).` : "",
    input.projetoRisco ? `Projeto em maior risco de atraso: ${input.projetoRisco.titulo} (${input.projetoRisco.risco}%).` : "",
    input.contaRisco
      ? `Maior risco de inadimplência: ${input.contaRisco.cliente}, saldo ${input.contaRisco.saldo} (${input.contaRisco.risco}%).`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const fallback =
    "Confira abaixo a previsão de receita, o lucro por cliente e os pontos de atenção. Priorize cobrar os saldos em aberto e destravar os projetos mais próximos do prazo.";

  try {
    const response = await anthropic.messages.create(
      {
        model: MODEL_STRONG,
        max_tokens: 380,
        system: SYSTEM,
        messages: [{ role: "user", content: `Dados de hoje:\n${linhas}` }],
      },
      { timeout: 12000, maxRetries: 1 },
    );
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n")
      .trim();
    return text || fallback;
  } catch (err) {
    console.error("[insights]", err);
    return fallback;
  }
}
