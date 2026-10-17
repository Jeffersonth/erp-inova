import { googleConfig } from "@/lib/auth/google";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: { erro?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/hoje");

  const errors: Record<string,string> = {
    google_indisponivel: "O acesso com Google ainda não está disponível. Entre com sua senha.",
    google_falhou: "Não foi possível entrar com Google. Use a conta autorizada e tente novamente, ou entre com sua senha.",
  };
  return <LoginForm googleEnabled={googleConfig().enabled} initialError={searchParams.erro ? errors[searchParams.erro] : undefined} />;
}
