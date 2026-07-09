import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL_STRONG } from "@/lib/ai/client";
import { assistantTools, executeTool } from "@/lib/ai/tools";
import { createClient } from "@/lib/supabase/server";

const SYSTEM = `Você é o assistente do ERP Pessoal da inova labs — um sistema de gestão para um desenvolvedor freelancer brasileiro (Rafael) que atende clientes no Brasil e no exterior.

Responda em português (pt-BR), direto e objetivo, como um colega que já olhou os dados. Use as tools disponíveis para consultar clientes, projetos, financeiro e anotações reais — nunca invente números ou nomes. Se uma pergunta não puder ser respondida com os dados disponíveis, diga isso claramente.

Você só responde e sugere — nunca envia mensagens, cobranças ou altera dados diretamente. Se o usuário pedir para "rascunhar", "cobrar" ou "enviar algo", escreva o rascunho da mensagem por completo dentro da sua resposta (pronto para copiar), deixando claro que ele deve revisar antes de enviar.`;

const MAX_ITERATIONS = 4;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const history: { role: "user" | "assistant"; content: string }[] = body.messages ?? [];
  if (!history.length) {
    return NextResponse.json({ error: "Nenhuma mensagem enviada" }, { status: 400 });
  }

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: MODEL_STRONG,
        max_tokens: 1024,
        system: SYSTEM,
        tools: assistantTools,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        return NextResponse.json({ text: text || "Não consegui gerar uma resposta." });
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const result = await executeTool(supabase, block.name, block.input as Record<string, unknown>);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({ text: "Essa pergunta exigiu mais passos do que o esperado — tente ser mais específico." });
  } catch (err) {
    console.error("[assistente]", err);
    return NextResponse.json({ error: "Erro ao consultar a IA. Tente novamente." }, { status: 500 });
  }
}
