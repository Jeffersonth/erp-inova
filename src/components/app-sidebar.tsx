"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Wallet,
  Sparkles,
  StickyNote,
  Settings,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/assistente", label: "Assistente IA", icon: Sparkles },
  { href: "/anotacoes", label: "Anotações", icon: StickyNote },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
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

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // fecha o drawer mobile sempre que a rota muda
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Barra superior — só mobile/tablet */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-navy px-4 py-3 text-soft md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex size-8 items-center justify-center rounded-lg hover:bg-white/10"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/dashboard">
          <Logo />
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
          <Link href="/dashboard">
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

        <div className="px-2.5 pb-2 text-[10px] font-semibold tracking-[0.08em] text-slate-500">
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
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                active
                  ? "bg-white/10 font-semibold text-white"
                  : "text-[#B9C6DC] hover:bg-white/[0.08] hover:text-white",
              )}
            >
              <Icon className="size-[15px]" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}

        <Link
          href="/configuracoes"
          className="mt-auto flex items-center gap-2 border-t border-white/10 px-2.5 pb-1 pt-3"
        >
          <div className="flex size-[26px] flex-none items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
            RM
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-white">Rafael M.</div>
            <div className="text-[10.5px] text-slate-500">Dev freelancer</div>
          </div>
        </Link>
      </nav>
    </>
  );
}
