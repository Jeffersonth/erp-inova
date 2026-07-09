import { NotesBoard } from "@/components/notes-board";
import { createClient } from "@/lib/supabase/server";

export default async function AnotacoesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("anotacoes")
    .select("id, texto, tag, due, detected_by_ia, concluida")
    .order("created_at", { ascending: false });

  return <NotesBoard initial={data ?? []} />;
}
