import { DayTasks, type DayTask } from "@/components/day-tasks";
import { createClient } from "@/lib/supabase/server";

export default async function TarefasPage() {
  const supabase = createClient();

  const { data: tarefas, error } = await supabase
    .from("tarefas_dia")
    .select("id, titulo, descricao, status, data_finalizar, ordem")
    .order("ordem");

  const dataHoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">
          Tarefas do dia
        </h1>
        <span className="text-[12.5px] text-mut">
          {dataHoje} · arraste para reordenar
        </span>
      </div>

      <p className="text-[13px] text-mut">
        Organize cada tarefa com um título e uma descrição curta.
      </p>
      {error ? (
        <p role="alert" className="erp-card p-5 text-sm text-danger">
          Não foi possível carregar suas tarefas. Atualize a página para tentar
          novamente.
        </p>
      ) : (
        <DayTasks initialTasks={(tarefas ?? []) as DayTask[]} />
      )}
    </div>
  );
}
