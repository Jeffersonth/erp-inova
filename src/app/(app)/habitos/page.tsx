import { createClient } from "@/lib/supabase/server";
import { agendaDate } from "@/lib/agenda-items";
import type { Habit, HabitCheck } from "@/lib/habits";
import { HabitsGarden } from "@/components/habits-garden";
export default async function HabitsPage() {
  const db = createClient();
  const [habits, checks] = await Promise.all([
    db
      .from<Habit>("habitos")
      .select("id,titulo,descricao,cor,inicio,arquivado")
      .order("created_at"),
    db.from<HabitCheck>("habitos_dias").select("habito_id,data").order("data"),
  ]);
  if (habits.error || checks.error)
    return (
      <p role="alert" className="erp-card p-6 text-sm text-danger">
        Não foi possível carregar seus hábitos. Atualize a página para tentar
        novamente.
      </p>
    );
  return (
    <HabitsGarden
      habits={habits.data ?? []}
      initialChecks={checks.data ?? []}
      today={agendaDate()}
    />
  );
}
