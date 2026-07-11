import { LeadsBoard } from "@/components/leads-board";
import { createClient } from "@/lib/supabase/server";
import type { LeadCanal, LeadRegistro } from "@/lib/leads";

export default async function LeadsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: canais }, { data: registros }] = await Promise.all([
    supabase.from("leads_canais").select("id, nome, ordem").order("ordem"),
    supabase
      .from("leads_registros")
      .select("id, canal_id, data, contatos, respostas, propostas, vendas, valor_vendido, observacoes")
      .order("data", { ascending: false }),
  ]);

  return (
    <LeadsBoard
      userId={user?.id ?? ""}
      canais={(canais ?? []) as LeadCanal[]}
      registrosInicial={(registros ?? []) as LeadRegistro[]}
    />
  );
}
