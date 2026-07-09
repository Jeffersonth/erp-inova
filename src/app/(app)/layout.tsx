import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppProviders } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/server";

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
      <div className="min-h-screen bg-background text-ink md:flex">
        <AppSidebar
          nome={nome}
          funcao={perfil?.funcao ?? "Dev freelancer"}
          avatarUrl={perfil?.avatar_url ?? null}
          iniciais={iniciais || "?"}
        />
        <main className="flex min-w-0 flex-1 flex-col gap-3 px-4 pb-7 pt-4 text-[13px] leading-[1.45] md:px-[22px] md:pt-[18px]">
          {children}
        </main>
      </div>
    </AppProviders>
  );
}
