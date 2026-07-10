import { NextResponse } from "next/server";
import { anthropic, MODEL_STRONG } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, relativeDate } from "@/lib/format";

function systemPrompt(nome?: string) {
  const emNome = nome ? `em nome de ${nome}, um desenvolvedor freelancer` : "em nome de um desenvolvedor freelancer";
  return `Você escreve mensagens curtas ${emNome} (inova labs) que presta serviços de sites/apps para clientes no Brasil e no exterior.

Escreva SOMENTE o corpo da mensagem, pronta para copiar e enviar por WhatsApp ou e-mail. Sem saudação de e-mail formal tipo "Prezado(a)", sem assinatura ao final, sem comentários sobre a tarefa. Tom direto e cordial. Se o cliente tiver nome em outro idioma/país, pode escrever em inglês quando fizer mais sentido. Nunca invente valores ou datas — use apenas os dados fornecidos.`;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: perfil } = await supabase.from("usuarios").select("nome").eq("id", user.id).maybeSingle();
  const primeiroNome = perfil?.nome?.trim().split(/\s+/)[0] || undefined;

  const { tipo, clienteId, recebimentoId } = await request.json();
  if (!clienteId) {
    return NextResponse.json({ error: "clienteId é obrigatório" }, { status: 400 });
  }

  const { data: cliente, error: clienteError } = await supabase
    .from("clientes")
    .select("nome, contato_nome, pais, ramo, status, score_ia, proxima_acao_ia, ultima_interacao, telefone")
    .eq("id", clienteId)
    .single();
  if (clienteError || !cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  let recebimento: { valor: string; vencimento: string; atrasado: boolean; risco_ia: number | null } | null = null;
  if (recebimentoId) {
    const { data: r } = await supabase
      .from("recebimentos")
      .select("valor, moeda, vencimento, status, risco_ia")
      .eq("id", recebimentoId)
      .single();
    if (r) {
      recebimento = {
        valor: formatMoney(Number(r.valor), r.moeda),
        vencimento: relativeDate(r.vencimento),
        atrasado: r.status === "atrasado",
        risco_ia: r.risco_ia,
      };
    }
  }

  const titulo =
    tipo === "cobranca"
      ? `Cobrança — ${cliente.nome}`
      : `Mensagem — ${cliente.nome}`;

  const contexto = {
    tipo,
    cliente: {
      nome: cliente.nome,
      contato: cliente.contato_nome,
      pais: cliente.pais,
      ramo: cliente.ramo,
      status: cliente.status,
      proxima_acao_sugerida: cliente.proxima_acao_ia,
    },
    recebimento,
  };

  const instrucao =
    tipo === "cobranca"
      ? recebimento?.atrasado
        ? "Escreva uma cobrança em tom firme mas educado — o pagamento já está atrasado."
        : "Escreva um lembrete amigável — o pagamento ainda não venceu ou venceu há pouco."
      : "Escreva uma mensagem de acompanhamento com o cliente, com base na ação sugerida.";

  try {
    const response = await anthropic.messages.create({
      model: MODEL_STRONG,
      max_tokens: 400,
      system: systemPrompt(primeiroNome),
      messages: [
        {
          role: "user",
          content: `${instrucao}\n\nDados:\n${JSON.stringify(contexto, null, 2)}`,
        },
      ],
    });

    const body = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n")
      .trim();

    return NextResponse.json({
      title: titulo,
      body: body || "Não foi possível gerar o rascunho.",
      telefone: cliente.telefone ?? null,
    });
  } catch (err) {
    console.error("[draft]", err);
    return NextResponse.json({ error: "Erro ao gerar rascunho" }, { status: 500 });
  }
}
