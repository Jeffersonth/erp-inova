import { anthropic, MODEL_CHEAP } from "./client";

const SYSTEM = `Você escreve o resumo do dia para Rafael, um desenvolvedor freelancer, dentro do ERP Pessoal dele.

Escreva 1 parágrafo curto (2–3 frases), em português, direto e prático — tipo "bom dia" de colega, não relatório corporativo. Use os números fornecidos com destaque (podem ir em **negrito markdown**). Não invente nada além do que foi passado. Não use saudação de e-mail nem assinatura.`;

export async function gerarResumoDia(input: {
  projetosAtivos: number;
  leadsAtivos: number;
  aReceber30d: string;
  mrr: string;
}): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL_CHEAP,
      max_tokens: 200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Dados de hoje:\n- Projetos ativos: ${input.projetosAtivos}\n- Leads ativos: ${input.leadsAtivos}\n- A receber nos próximos 30 dias: ${input.aReceber30d}\n- MRR (receita recorrente ativa): ${input.mrr}`,
        },
      ],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n")
      .trim();
    return text || "Bom dia, Rafael! Confira os números do dia abaixo.";
  } catch (err) {
    console.error("[resumo]", err);
    return "Bom dia, Rafael! Confira os números do dia abaixo.";
  }
}
