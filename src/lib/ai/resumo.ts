import { anthropic, MODEL_CHEAP } from "./client";

function systemPrompt(nome?: string) {
  const alvo = nome ? `${nome}, um desenvolvedor freelancer` : "um desenvolvedor freelancer";
  return `Você escreve o resumo do dia para ${alvo}, dentro do ERP Pessoal dele.

Escreva 1 parágrafo curto (2–3 frases), em português, direto e prático — tipo "bom dia" de colega, não relatório corporativo. Use os números fornecidos com destaque (podem ir em **negrito markdown**). Não invente nada além do que foi passado. Não use saudação de e-mail nem assinatura.`;
}

export async function gerarResumoDia(input: {
  projetosAtivos: number;
  leadsAtivos: number;
  aReceber: string;
  mrr: string;
  nome?: string;
}): Promise<string> {
  const saudacao = input.nome ? `Olá, ${input.nome}! ` : "";
  const fallback = `${saudacao}Confira os números do seu dia abaixo.`;
  try {
    const response = await anthropic.messages.create(
      {
        model: MODEL_CHEAP,
        max_tokens: 200,
        system: systemPrompt(input.nome),
        messages: [
          {
            role: "user",
            content: `Dados de hoje:\n- Projetos ativos: ${input.projetosAtivos}\n- Leads ativos: ${input.leadsAtivos}\n- A receber (saldo em aberto): ${input.aReceber}\n- MRR (receita recorrente ativa): ${input.mrr}`,
          },
        ],
      },
      { timeout: 8000, maxRetries: 1 },
    );
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n")
      .trim();
    return text || fallback;
  } catch (err) {
    console.error("[resumo]", err);
    return fallback;
  }
}
