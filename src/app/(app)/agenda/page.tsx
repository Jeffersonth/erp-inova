import { Agenda } from "@/components/agenda";
import { createClient } from "@/lib/supabase/server";
import { agendaDate, validAgendaDate, type AgendaEvent, type AgendaTask, type AgendaRecebimento } from "@/lib/agenda-items";

export default async function AgendaPage({ searchParams }: { searchParams: { dia?: string; item?: string } }) {
  const db = createClient();
  const [eventos, tarefas, projetos, recebimentos] = await Promise.all([
    db.from<AgendaEvent>("eventos_agenda").select("id, titulo, tipo_ev, quando, fim, dia_inteiro, local, notas, projeto_id, valor, moeda, pago").order("quando"),
    db.from<AgendaTask>("tarefas_dia").select("id, titulo, data_finalizar").neq("status", "concluida").not("data_finalizar", "is", null),
    db.from<{ id: string; titulo: string }>("projetos").select("id, titulo").order("created_at"),
    db.from<AgendaRecebimento>("recebimentos").select("id, descricao, valor, valor_pago, moeda, status, vencimento, clientes(nome)").not("vencimento", "is", null),
  ]);
  if (eventos.error || tarefas.error || recebimentos.error) return <p role="alert" className="rounded-xl border border-line bg-card p-5 text-sm text-mut">Não foi possível carregar a agenda. Atualize a página para tentar novamente.</p>;
  return <div className="flex flex-col gap-3">
    <div><h1 className="text-[18px] font-extrabold text-ink">Agenda</h1><p className="mt-1 text-[13px] text-mut">Datas importantes e pagamentos organizados por dia, semana e mês.</p></div>
    <Agenda eventosIniciais={eventos.data ?? []} tarefasIniciais={tarefas.data ?? []} recebimentos={recebimentos.data ?? []} projetos={projetos.data ?? []} initialDay={searchParams.dia && validAgendaDate(searchParams.dia) ? searchParams.dia : agendaDate()} initialItem={searchParams.item} />
  </div>;
}
