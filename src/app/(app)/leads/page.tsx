import { LeadsBoard } from "@/components/leads-board";
import { createClient } from "@/lib/supabase/server";
import type { LeadCanal, LeadMeta, LeadRegistro } from "@/lib/leads";

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

  return (
    <LeadsBoard
      userId={user?.id ?? ""}
      canais={(canais ?? []) as LeadCanal[]}
      registrosInicial={(registros ?? []) as LeadRegistro[]}
      metasInicial={(metas ?? []) as LeadMeta[]}
      mesInicioIso={mesInicioIso}
    />
  );
}
