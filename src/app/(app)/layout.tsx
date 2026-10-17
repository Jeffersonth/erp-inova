import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppProviders } from "@/components/app-providers";
import { FocusTimerProvider } from "@/components/focus-timer-provider";
import { createClient } from "@/lib/supabase/server";
import { AppTopbar } from "@/components/app-topbar";
import { PageTransition } from "@/components/page-transition";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nome, funcao, avatar_url")
    .eq("id", user.id)
    .single();

  const nome = perfil?.nome ?? user.email?.split("@")[0] ?? "Você";
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppProviders>
      <FocusTimerProvider>
        <div className="erp-shell min-h-screen bg-background text-ink md:flex">
          <a className="erp-skip-link" href="#conteudo">Pular para o conteúdo</a>
          <AppSidebar
            nome={nome}
            funcao={perfil?.funcao ?? "Dev freelancer"}
            avatarUrl={perfil?.avatar_url ?? null}
            iniciais={iniciais || "?"}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppTopbar date={new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", day: "numeric", month: "long" }).format(new Date())} />
            <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-[1680px] min-w-0 flex-1 px-4 pb-[96px] pt-5 text-[14px] leading-[1.5] outline-none md:px-7 md:pb-9 md:pt-7 lg:px-8">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </FocusTimerProvider>
    </AppProviders>
  );
}
