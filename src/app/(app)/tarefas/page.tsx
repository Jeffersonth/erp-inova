import { DayTasks, type DayTask } from "@/components/day-tasks";
import { createClient } from "@/lib/supabase/server";

export default async function TarefasPage() {
  const supabase = createClient();

  const { data: tarefas } = await supabase
    .from("tarefas_dia")
    .select("id, titulo, status, data_finalizar, ordem")
    .order("ordem");

  const dataHoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">Tarefas do dia</h1>
        <span className="text-[12.5px] text-mut">{dataHoje} · arraste para reordenar</span>
      </div>

      <DayTasks initialTasks={(tarefas ?? []) as DayTask[]} />
    </div>
  );
}
