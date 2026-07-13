"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Target,
  Users,
  Megaphone,
  FolderKanban,
  Wallet,
  Timer,
  Sparkles,
  StickyNote,
  Settings,
  Menu,
  X,
  LogOut,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/hoje", label: "Hoje", icon: Target },
  { href: "/tarefas", label: "Tarefas do dia", icon: ListTodo },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/leads", label: "Leads", icon: Megaphone },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/anotacoes", label: "Anotações", icon: StickyNote },
  { href: "/assistente", label: "Assistente IA", icon: Sparkles },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Time Tracker", icon: Timer },
];

// Título + subtítulo por tela no header mobile (do design ERP Pessoal Mobile)
const mobileTitles: Record<string, [string, string]> = {
  "/hoje": ["Hoje", "sua central de execução"],
  "/tarefas": ["Tarefas do dia", "arraste para reordenar"],
  "/crm": ["CRM", "clientes e leads"],
  "/leads": ["Leads", "inteligência comercial"],
  "/projetos": ["Projetos", "quadro de tarefas"],
  "/financeiro": ["Finanças", "R$ · US$ · €"],
  "/tracker": ["Time Tracker", "foco, pausas e histórico"],
  "/agenda": ["Agenda", "mês · semana · dia"],
  "/assistente": ["Assistente IA", "toda ação vira rascunho"],
  "/anotacoes": ["Anotações", "a IA detecta o prazo"],
  "/dashboard": ["Painel", "visão do negócio"],
  "/configuracoes": ["Configurações", "perfil e integrações"],
};

// Bottom nav mobile — 5 atalhos do design (glifos do próprio design)
const bottomTabs: { href: string; icon: string; label: string }[] = [
  { href: "/hoje", icon: "◎", label: "Hoje" },
  { href: "/dashboard", icon: "▣", label: "Painel" },
  { href: "/assistente", icon: "✦", label: "IA" },
  { href: "/anotacoes", icon: "✎", label: "Notas" },
  { href: "/financeiro", icon: "$", label: "Finanças" },
];

function Logo() {
  return (
    <span className="flex items-baseline gap-px text-[17px] font-extrabold tracking-[-0.02em] text-soft">
      <span className="relative">
        in
        <span className="absolute -bottom-[3px] left-0 h-[3px] w-full rounded-sm bg-aqua" />
      </span>
      <span>ova&nbsp;labs</span>
      <span className="ml-[3px] h-[5px] w-[5px] rounded-full bg-aqua" />
    </span>
  );
}

type AppSidebarProps = {
  nome: string;
  funcao: string;
  avatarUrl: string | null;
  iniciais: string;
};

export function AppSidebar({ nome, funcao, avatarUrl, iniciais }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // fecha o drawer mobile sempre que a rota muda
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const [titulo, subtitulo] =
    mobileTitles[
      Object.keys(mobileTitles).find((k) => pathname === k || pathname.startsWith(k + "/")) ?? "/hoje"
    ] ?? ["inova labs", "ERP pessoal"];

  return (
    <>
      {/* Barra superior — só mobile/tablet (header do design) */}
      <div className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-white/10 bg-navy px-3 py-2.5 text-soft md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex size-8 flex-none items-center justify-center rounded-lg hover:bg-white/10"
        >
          <Menu className="size-5" />
        </button>
        <Link
          href="/hoje"
          className="flex size-[30px] flex-none items-center justify-center rounded-[9px] text-[12px] font-extrabold text-white"
          style={{ background: "linear-gradient(135deg,#1D5BFF,#00D1FF)" }}
        >
          in
        </Link>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-extrabold tracking-[-0.01em]">{titulo}</div>
          <div className="truncate text-[10.5px] text-[#8DA2C0]">{subtitulo}</div>
        </div>
        <Link href="/configuracoes" className="ml-auto flex-none" aria-label="Perfil">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-[30px] rounded-full object-cover" />
          ) : (
            <span className="flex size-[30px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
              {iniciais}
            </span>
          )}
        </Link>
      </div>

      {/* Backdrop — só quando o drawer mobile está aberto */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Sidebar: drawer off-canvas no mobile, coluna fixa a partir de md */}
      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[212px] flex-col gap-0.5 bg-navy px-3 py-4 text-soft transition-transform duration-200 ease-out",
          "md:sticky md:top-0 md:z-auto md:h-screen md:flex-none md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2.5 pb-[18px] pt-1">
          <Link href="/hoje">
            <Logo />
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="flex size-7 items-center justify-center rounded-lg hover:bg-white/10 md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-2.5 pb-2 text-[10px] font-semibold tracking-[0.08em] text-white/70">
          ERP PESSOAL
        </div>

        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-white transition-colors",
                active ? "bg-white/10 font-semibold" : "hover:bg-white/[0.08]",
              )}
            >
              <Icon className="size-[15px]" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}

        {/* Prospector (app externo) */}
        <a
          href="https://prospector.inovalabs.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-white transition-colors hover:bg-white/[0.08]"
        >
          <ExternalLink className="size-[15px]" strokeWidth={2} />
          Prospector
        </a>

        <div className="mt-auto flex items-center gap-1.5 border-t border-white/10 px-2.5 pb-1 pt-3">
          <Link href="/configuracoes" className="flex min-w-0 flex-1 items-center gap-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="size-[26px] flex-none rounded-full object-cover"
              />
            ) : (
              <div className="flex size-[26px] flex-none items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                {iniciais}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-white">{nome}</div>
              <div className="truncate text-[10.5px] text-white/70">{funcao}</div>
            </div>
          </Link>
          <Link
            href="/configuracoes"
            aria-label="Configurações"
            title="Configurações"
            className="flex flex-none items-center justify-center rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Settings className="size-4" strokeWidth={2} />
          </Link>
          <button
            onClick={signOut}
            aria-label="Sair"
            title="Sair"
            className="flex flex-none items-center justify-center rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" strokeWidth={2} />
          </button>
        </div>
      </nav>

      {/* Bottom nav — só mobile (5 atalhos do design) */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#1C3560] bg-navy px-1 pt-1.5 md:hidden"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        {bottomTabs.map((t) => {
          const ativo = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex min-h-[48px] flex-col items-center justify-center gap-[3px] py-1.5",
                ativo ? "text-aqua" : "text-[#8DA2C0]",
              )}
            >
              <span className="text-[17px] leading-none">{t.icon}</span>
              <span className="text-[9.5px] font-semibold">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
