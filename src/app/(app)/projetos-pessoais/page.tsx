import { createClient } from "@/lib/supabase/server";
import { PersonalProjects } from "@/components/personal-projects";
import type { PersonalProject } from "@/lib/personal-projects";

export default async function ProjetosPessoaisPage() {
  const { data, error } = await createClient().from<PersonalProject>("projetos_pessoais")
    .select("id, titulo, categoria, prazo, anotacoes, etapas").order("created_at", { ascending: false });
  if (error) return <div role="alert" className="rounded-xl border border-line bg-card p-6 text-sm text-mut">Não foi possível carregar seus projetos pessoais. Tente novamente em instantes.</div>;
  return <PersonalProjects initial={data ?? []} />;
}
