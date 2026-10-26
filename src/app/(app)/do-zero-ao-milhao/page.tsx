import { createClient } from "@/lib/supabase/server";
import { agendaDate } from "@/lib/agenda-items";
import type { JourneyGain, JourneyGoal } from "@/lib/million";
import { MillionJourney } from "@/components/million-journey";
export default async function MillionPage() {
  const db = createClient();
  const [gains, goals] = await Promise.all([
    db
      .from<JourneyGain>("jornada_ganhos")
      .select("id,titulo,valor_centavos,data,origem,notas")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false }),
    db
      .from<JourneyGoal>("jornada_objetivos")
      .select("id,titulo,alvo_centavos,tipo,mes,prazo,concluido_em")
      .order("created_at"),
  ]);
  if (gains.error || goals.error)
    return (
      <p role="alert" className="erp-card p-6 text-sm text-danger">
        Não foi possível carregar sua jornada. Atualize a página para tentar
        novamente.
      </p>
    );
  return (
    <MillionJourney
      gains={gains.data ?? []}
      goals={goals.data ?? []}
      today={agendaDate()}
    />
  );
}
