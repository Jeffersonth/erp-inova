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
  StickyNote,
  BookOpen,
  Utensils,
  Settings,
  Menu,
  X,
  LogOut,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLogo, AppIcon } from "@/components/app-brand";

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/hoje", label: "Hoje", icon: Target },
  { href: "/tarefas", label: "Tarefas do dia", icon: ListTodo },
  { href: "/projetos-pessoais", label: "Projetos - Pessoal", icon: FolderKanban },
  { href: "/projetos", label: "Projetos - Trabalho", icon: FolderKanban },
  { href: "/prospeccao", label: "Prospecção", icon: Megaphone },
  { href: "/crm", label: "Clientes", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/do-zero-ao-milhao", label: "Do zero ao milhão", icon: Trophy },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/anotacoes", label: "Anotações", icon: StickyNote },
  { href: "/rotina-dieta", label: "Rotina e Dieta", icon: Utensils },
  { href: "/regras", label: "Regras", icon: BookOpen },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Time Tracker", icon: Timer },
];

// Título + subtítulo por tela no header mobile (do design ERP Pessoal Mobile)
const mobileTitles: Record<string, [string, string]> = {
  "/hoje": ["Hoje", "sua central de execução"],
  "/tarefas": ["Tarefas do dia", "arraste para reordenar"],
  "/crm": ["Clientes", "clientes e leads"],
  "/prospeccao": ["Prospecção", "contatos e oportunidades"],
  "/projetos-pessoais": ["Projetos - Pessoal", "suas ideias em andamento"],
  "/projetos": ["Projetos - Trabalho", "quadro de tarefas"],
  "/financeiro": ["Finanças", "R$ · US$ · €"],
  "/do-zero-ao-milhao": ["Do zero ao milhão", "seus ganhos e conquistas"],
  "/tracker": ["Time Tracker", "foco, pausas e histórico"],
  "/agenda": ["Agenda", "mês · semana · dia"],
  "/assistente": ["Assistente IA", "toda ação vira rascunho"],
  "/anotacoes": ["Anotações", "a IA detecta o prazo"],
  "/rotina-dieta": ["Rotina e Dieta", "seus horários e refeições"],
  "/regras": ["Regras", "seus princípios por categoria"],
  "/dashboard": ["Painel", "pessoal · comercial · financeiro"],
  "/configuracoes": ["Configurações", "perfil e integrações"],
};

// Bottom nav mobile — 5 atalhos do design (glifos do próprio design)
const bottomTabs: { href: string; icon: LucideIcon; label: string }[] = [
  { href: "/hoje", icon: Target, label: "Hoje" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { href: "/assistente", icon: Sparkles, label: "IA" },
  { href: "/anotacoes", icon: StickyNote, label: "Notas" },
  { href: "/financeiro", icon: Wallet, label: "Finanças" },
];

function Logo() {
  return <AppLogo compact className="w-[112px] md:w-[132px]" />;
}

type AppSidebarProps = {
  nome: string;
  funcao: string;
  avatarUrl: string | null;
  iniciais: string;
};

export function AppSidebar({ avatarUrl, iniciais }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // fecha o drawer mobile sempre que a rota muda
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", escape); };
  }, [open]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const [titulo, subtitulo] =
    mobileTitles[
      Object.keys(mobileTitles).find((k) => pathname === k || pathname.startsWith(k + "/")) ?? "/hoje"
    ] ?? ["ERP Pessoal", "seu dia organizado"];

  return (
    <>
      {/* Barra superior — só mobile/tablet (header do design) */}
      <div className="erp-sidebar sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 px-4 py-3 text-soft md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex size-8 flex-none items-center justify-center rounded-lg hover:bg-white/10"
        >
          <Menu className="size-5" />
        </button>
        <Link
          href="/hoje"
          aria-label="ERP Pessoal — Hoje"
          className="flex size-[30px] flex-none items-center justify-center"
        >
          <AppIcon />
        </Link>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-extrabold tracking-[-0.01em]">{titulo}</div>
          <div className="truncate text-[10.5px] text-[#B8AEC9]">{subtitulo}</div>
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
          className="fixed inset-0 z-40 bg-[#140D24]/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar: drawer off-canvas no mobile, coluna fixa a partir de md */}
      <nav
        aria-label="Menu principal"
        className={cn(
          "erp-sidebar fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[224px] flex-col gap-0.5 px-3 py-3 text-soft shadow-2xl shadow-navy/10 transition-transform duration-300 ease-out",
          "md:sticky md:top-0 md:z-auto md:flex-none md:translate-x-0",
          open ? "visible translate-x-0" : "invisible -translate-x-full md:visible",
        )}
      >
        <div className="mb-2 flex shrink-0 items-center justify-between gap-1 border-b border-white/[0.08] pb-3 pt-1">
          <Link href="/hoje">
            <Logo />
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <Link href="/configuracoes" aria-label="Configurações" title="Configurações" className="flex size-6 items-center justify-center rounded-md text-white/90 hover:bg-white/10 hover:text-white"><Settings size={14} /></Link>
            <button onClick={signOut} aria-label="Sair" title="Sair" className="flex size-6 items-center justify-center rounded-md text-white/90 hover:bg-white/10 hover:text-white"><LogOut size={14} /></button>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-white/10 md:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-2 pb-1.5 text-[9px] font-semibold tracking-[0.18em] text-[#B8AEC9]/70">
          SEU ESPAÇO
        </div>
        <div className="thin-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pb-1">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "erp-nav-link flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px]",
                active ? "font-semibold" : "font-medium",
              )}
            >
              <span className="erp-nav-icon flex size-[24px] shrink-0 items-center justify-center rounded-lg"><Icon className="size-[17px]" strokeWidth={1.8} /></span>
              {item.label}
            </Link>
          );
        })}
        </div>
      </nav>

      {/* Bottom nav — só mobile (5 atalhos do design) */}
      <div
        className="erp-sidebar fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-white/10 px-2 pt-1.5 shadow-[0_-8px_30px_rgba(20,13,36,.1)] md:hidden"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        {bottomTabs.map((t) => {
          const ativo = pathname === t.href || pathname.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "erp-bottom-tab relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[#B8AEC9]",
              )}
            >
              <Icon className="size-[19px]" strokeWidth={1.8} />
              <span className="text-[9.5px] font-semibold">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
