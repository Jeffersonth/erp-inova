import { Agenda, type Evento, type DiaTask } from "@/components/agenda";
import { createClient } from "@/lib/supabase/server";

export default async function AgendaPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const desde = new Date();
  desde.setDate(desde.getDate() - 62);

  const [{ data: eventos }, { data: tarefas }, { data: projetos }] = await Promise.all([
    supabase
      .from("eventos_agenda")
      .select("id, titulo, tipo_ev, quando, fim, dia_inteiro, local, notas, projeto_id")
      .gte("quando", desde.toISOString())
      .order("quando", { ascending: true }),
    supabase
      .from("tarefas_dia")
      .select("id, titulo, data_finalizar")
      .neq("status", "concluida")
      .not("data_finalizar", "is", null),
    supabase.from("projetos").select("id, titulo").order("created_at", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">Agenda</h1>
        <span className="text-[12.5px] text-mut">reuniões, lembretes e blocos de tempo</span>
      </div>

      <Agenda
        userId={user?.id ?? ""}
        eventosIniciais={(eventos ?? []) as Evento[]}
        tarefasIniciais={(tarefas ?? []) as DiaTask[]}
        projetos={projetos ?? []}
      />
    </div>
  );
}
