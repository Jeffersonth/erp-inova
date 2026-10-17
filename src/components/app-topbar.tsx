"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronRight, Timer } from "lucide-react";

const labels: Record<string, string> = {
  hoje: "Hoje", tarefas: "Tarefas do dia", "projetos-pessoais": "Projetos - Pessoal",
  projetos: "Projetos - Trabalho", leads: "Leads", crm: "Clientes", financeiro: "Financeiro",
  agenda: "Agenda", anotacoes: "Anotações", dashboard: "Dashboard", tracker: "Time Tracker",
  configuracoes: "Configurações", assistente: "Assistente IA",
};
export function AppTopbar({ date }: { date: string }) {
  const path = usePathname().split("/")[1];
  return <header className="erp-topbar sticky top-0 z-20 hidden h-[72px] shrink-0 items-center justify-between gap-3 border-b border-line px-7 md:flex">
    <nav aria-label="Localização" className="flex items-center gap-2 text-xs"><Link href="/hoje" className="font-medium text-mut hover:text-brand">ERP Pessoal</Link><ChevronRight size={13} className="text-mut/60" /><span className="font-semibold text-ink">{labels[path] ?? "Seu espaço"}</span></nav>
    <div className="flex items-center gap-3"><Link href="/agenda" className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs text-mut hover:border-brand/30 hover:text-brand"><CalendarDays size={14} /><span className="capitalize">{date}</span></Link><span className="h-5 w-px bg-line" /><Link href="/tracker" aria-label="Abrir Time Tracker" title="Time Tracker" className="rounded-xl border border-line p-2 text-mut hover:border-brand/30 hover:text-brand"><Timer size={17} /></Link></div>
  </header>;
}
