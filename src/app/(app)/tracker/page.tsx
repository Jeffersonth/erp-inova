import { TimeTracker } from "@/components/time-tracker";
import type { SessaoRow } from "@/components/focus-timer-provider";
import { createClient } from "@/lib/supabase/server";

export default async function TrackerPage() {
  const supabase = createClient();

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const [{ data: projetos }, { data: sessoes }, { data: hoje }] = await Promise.all([
    supabase.from("projetos").select("id, titulo").order("created_at", { ascending: true }),
    supabase
      .from("sessoes_foco")
      .select("id, tipo, categoria, duracao_seg, rotulo, finalizada_em, projetos(titulo)")
      .order("finalizada_em", { ascending: false })
      .limit(50),
    supabase
      .from("sessoes_foco")
      .select("duracao_seg")
      .eq("tipo", "foco")
      .gte("finalizada_em", inicioHoje.toISOString()),
  ]);

  const totalHoje = (hoje ?? []).reduce((s, r) => s + Number(r.duracao_seg), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">Time Tracker</h1>
        <span className="text-[12.5px] text-mut">pomodoro · foque, faça pausas, acompanhe seu tempo</span>
      </div>

      <TimeTracker
        projetos={projetos ?? []}
        historicoInicial={(sessoes ?? []) as SessaoRow[]}
        totalHojeInicial={totalHoje}
      />
    </div>
  );
}
