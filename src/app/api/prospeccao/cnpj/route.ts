import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Consulta pública de CNPJ via BrasilAPI (grátis, sem chave).
// Docs: https://brasilapi.com.br/docs#tag/CNPJ
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const digits = String(body?.cnpj ?? "").replace(/\D/g, "");
  if (digits.length !== 14) {
    return NextResponse.json({ error: "Informe um CNPJ válido (14 dígitos)." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404) return NextResponse.json({ error: "CNPJ não encontrado na Receita." }, { status: 404 });
    if (res.status === 429) return NextResponse.json({ error: "Muitas consultas — tente de novo em instantes." }, { status: 429 });
    if (!res.ok) return NextResponse.json({ error: "Não foi possível consultar a Receita agora." }, { status: 502 });

    const d = await res.json();
    const endereco =
      [d.logradouro, d.numero, d.bairro, d.municipio, d.uf].filter(Boolean).join(", ") || null;

    return NextResponse.json({
      cnpj: digits,
      razaoSocial: d.razao_social ?? null,
      nomeFantasia: d.nome_fantasia || null,
      situacao: d.descricao_situacao_cadastral ?? null,
      atividade: d.cnae_fiscal_descricao ?? null,
      porte: d.porte ?? null,
      capital: typeof d.capital_social === "number" ? d.capital_social : null,
      telefone: d.ddd_telefone_1 || null,
      email: d.email || null,
      municipio: d.municipio ?? null,
      uf: d.uf ?? null,
      endereco,
      abertura: d.data_inicio_atividade ?? null,
      socios: Array.isArray(d.qsa)
        ? d.qsa.map((s: { nome_socio?: string }) => s.nome_socio).filter(Boolean).slice(0, 6)
        : [],
    });
  } catch {
    return NextResponse.json({ error: "Erro ao consultar o CNPJ." }, { status: 500 });
  }
}
