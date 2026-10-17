import { RulesBoard } from "@/components/rules-board";
import { createClient } from "@/lib/supabase/server";
import type { Regra, RegraCategoria } from "@/lib/regras";

export default async function RegrasPage() {
  const db = createClient();
  const [categories,rules] = await Promise.all([
    db.from<RegraCategoria>("regras_categorias").select("id,nome,ordem").order("ordem").order("created_at"),
    db.from<Regra>("regras").select("id,categoria_id,texto,ordem").order("ordem").order("created_at"),
  ]);
  if (categories.error || rules.error) return <p role="alert" className="erp-card p-5 text-mut">Não foi possível carregar suas regras. Atualize a página para tentar novamente.</p>;
  return <RulesBoard categories={categories.data ?? []} rules={rules.data ?? []}/>;
}
