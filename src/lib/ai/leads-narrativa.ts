import { anthropic, MODEL_STRONG } from "./client";

const SYSTEM = `Você é o analista comercial do ERP Pessoal de um desenvolvedor freelancer.
A partir dos números de prospecção fornecidos (todos reais, já calculados), escreva uma análise curta em português (pt-BR):
- 2 a 3 frases lendo a situação (volume, taxas, canais).
- Depois, 2 recomendações práticas de prospecção em bullets começando com "•".
Use os valores com destaque em **negrito markdown**. Não invente números além dos fornecidos. Seja direto, como um gestor comercial olhando o painel.`;

export type LeadsNarrativaInput = {
  mesLabel: string;
  contatos: number;
  respostas: number;
  propostas: number;
  vendas: number;
  receita: string;
  taxaResposta: number;
  taxaConversao: number;
  achados: string[]; // frases determinísticas já calculadas
};

export async function gerarAnaliseLeads(input: LeadsNarrativaInput): Promise<string> {
  const fallback =
    "Confira os achados abaixo: eles mostram quais canais respondem e convertem melhor. Concentre o esforço nos 2 canais com melhor taxa e registre a prospecção todo dia para a análise ficar mais precisa.";

  if (input.contatos === 0 && input.achados.length === 0) {
    return "Ainda não há registros de prospecção suficientes. Registre seus contatos diários por canal e eu começo a apontar o que funciona melhor.";
  }

  const linhas = [
    `Mês de ${input.mesLabel}: ${input.contatos} contatos, ${input.respostas} respostas, ${input.propostas} propostas, ${input.vendas} vendas, receita ${input.receita}.`,
    `Taxa de resposta: ${input.taxaResposta}% · taxa de conversão: ${input.taxaConversao}%.`,
    input.achados.length ? `Achados já calculados:\n- ${input.achados.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await anthropic.messages.create(
      {
        model: MODEL_STRONG,
        max_tokens: 350,
        system: SYSTEM,
        messages: [{ role: "user", content: `Dados de prospecção:\n${linhas}` }],
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
    console.error("[leads-narrativa]", err);
    return fallback;
  }
}
