"use client";

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

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 flex h-screen w-[212px] flex-none flex-col gap-0.5 bg-navy px-3 py-4 text-soft">
      <Link
        href="/dashboard"
        className="flex items-baseline gap-px px-2.5 pb-[18px] pt-1 text-[17px] font-extrabold tracking-[-0.02em] text-soft"
      >
        <span className="relative">
          in
          <span className="absolute -bottom-[3px] left-0 h-[3px] w-full rounded-sm bg-aqua" />
        </span>
        <span>ova&nbsp;labs</span>
        <span className="ml-[3px] h-[5px] w-[5px] rounded-full bg-aqua" />
      </Link>

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
  );
}
