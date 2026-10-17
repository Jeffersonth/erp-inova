import { RoutineBoard } from "@/components/routine-board";
import { createClient } from "@/lib/supabase/server";
import type { RotinaItem } from "@/lib/rotina";
export default async function RotinaDietaPage() {
  const { data,error } = await createClient().from<RotinaItem>("rotina_itens").select("id,tipo,titulo,horario,dias,descricao,ordem").order("ordem").order("created_at");
  if (error) return <p role="alert" className="erp-card p-5 text-mut">Não foi possível carregar sua rotina. Atualize a página para tentar novamente.</p>;
  return <RoutineBoard items={data??[]}/>;
}
