import { ChangePasswordForm } from "@/components/change-password-form";
import { redirect } from "next/navigation";
import { IaBadge } from "@/components/ia-badge";
import { PerfilForm } from "@/components/perfil-form";
import { createClient } from "@/lib/supabase/server";

const card = "erp-card";

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, nome, email, telefone, funcao, avatar_url, meta_horas_dia")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex max-w-[840px] flex-col gap-3">
      <h1 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">Configurações</h1>

      {/* Usuário administrador */}
      <div className={`${card} px-[18px] py-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[13.5px] text-ink">Usuário administrador</b>
          <span className="rounded-full border border-line bg-soft px-2.5 py-[3px] text-[11px] font-semibold text-mut">
            sistema de uso pessoal · cadastro de novos usuários bloqueado
          </span>
        </div>
        {perfil && <PerfilForm perfil={perfil} />}
      </div>

      <ChangePasswordForm />

      {/* Integrações */}
      <div className={`${card} flex flex-col px-4 py-3`}>
        <b className="text-[13.5px] text-ink">Integrações</b>

        <div className="mt-1.5 flex items-center gap-2.5 border-b border-line py-2.5">
          <span className="flex size-[30px] flex-none items-center justify-center rounded-lg border border-line bg-soft text-[13px] font-extrabold text-[#635BFF]">
            S
          </span>
          <div>
            <b className="text-[13px] text-ink">Stripe</b>
            <div className="text-[12px] text-mut">assinaturas ativas e MRR direto da sua conta</div>
          </div>
          {process.env.STRIPE_SECRET_KEY ? (
            <span className="ml-auto text-[12px] font-bold text-ok">● Conectado</span>
          ) : (
            <span className="ml-auto text-[12px] font-semibold text-mut">configure STRIPE_SECRET_KEY</span>
          )}
        </div>

        <div className="flex items-center gap-2.5 py-2.5">
          <span className="flex size-[30px] flex-none items-center justify-center rounded-lg border border-aqua/45 bg-aqua/10 text-[13px] font-extrabold text-ia">
            ✦
          </span>
          <div>
            <b className="text-[13px] text-ink">Motor de IA</b>
            <div className="text-[12px] text-mut">rascunhos, scores, previsões e detecção de prazos</div>
          </div>
          <span className="ml-auto text-[12px] font-bold text-ok">● Conectado</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 text-[12px] text-mut">
        <IaBadge className="px-1.5 py-px text-[10px]" />
        Perfil e foto salvos com segurança na VPS. WhatsApp funciona pelo botão &ldquo;Enviar no WhatsApp&rdquo; dos rascunhos
        (link wa.me, sem integração).
      </div>
    </div>
  );
}
