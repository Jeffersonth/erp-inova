import { redirect } from "next/navigation";
import { IaBadge } from "@/components/ia-badge";
import { PerfilForm } from "@/components/perfil-form";
import { createClient } from "@/lib/supabase/server";

const card = "rounded-xl border border-line bg-card";
const usersCols = "grid-cols-[1.4fr_1fr_2fr]";

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
        <b className="text-[13.5px] text-ink">Usuário administrador</b>
        {perfil && <PerfilForm perfil={perfil} />}
      </div>

      {/* Usuários e permissões */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2 px-4 pb-2 pt-3">
          <b className="text-[13.5px] text-ink">Usuários e permissões</b>
          <button className="ml-auto rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:border-brand">
            + Convidar usuário
          </button>
        </div>
        <div className={`grid ${usersCols} gap-2 border-b border-line px-4 py-2 text-[11px] font-semibold tracking-[0.07em] text-mut`}>
          <span>USUÁRIO</span>
          <span>PAPEL</span>
          <span>MÓDULOS</span>
        </div>
        <div className={`grid ${usersCols} items-center gap-2 border-b border-line px-4 py-2.5 text-[13px]`}>
          <div>
            <b className="text-ink">{perfil?.nome ?? user.email}</b>
            <div className="text-[11.5px] text-mut">{perfil?.email ?? user.email}</div>
          </div>
          <span className="text-[12px] font-bold text-brand">Administrador</span>
          <div>
            <span className="rounded-full border border-line bg-soft px-2 py-0.5 text-[11px] font-semibold text-mut">
              Todos os módulos
            </span>
          </div>
        </div>
        <div className={`grid ${usersCols} items-center gap-2 px-4 py-2.5 text-[13px]`}>
          <div>
            <b className="text-ink">Cléa Contábil</b>
            <div className="text-[11.5px] text-mut">clea@contabil.com.br</div>
          </div>
          <span className="text-[12px] font-bold text-mut">Convidada</span>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-line bg-soft px-2 py-0.5 text-[11px] font-semibold text-mut">
              Financeiro · leitura
            </span>
            <span className="rounded-full border border-line bg-soft px-2 py-0.5 text-[11px] font-semibold text-mut">
              Notas fiscais · edição
            </span>
          </div>
        </div>
      </div>

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

        <div className="flex items-center gap-2.5 border-b border-line py-2.5">
          <span className="flex size-[30px] flex-none items-center justify-center rounded-lg border border-aqua/45 bg-aqua/10 text-[13px] font-extrabold text-ia">
            ✦
          </span>
          <div>
            <b className="text-[13px] text-ink">Motor de IA</b>
            <div className="text-[12px] text-mut">rascunhos, scores, previsões e detecção de prazos</div>
          </div>
          <span className="ml-auto text-[12px] font-bold text-ok">● Conectado</span>
        </div>

        <div className="flex items-center gap-2.5 py-2.5">
          <span className="flex size-[30px] flex-none items-center justify-center rounded-lg border border-line bg-soft text-[13px] font-extrabold text-ok">
            W
          </span>
          <div>
            <b className="text-[13px] text-ink">WhatsApp Business</b>
            <div className="text-[12px] text-mut">enviar cobranças e follow-ups aprovados</div>
          </div>
          <button className="ml-auto rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-brand">
            Conectar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 text-[12px] text-mut">
        <IaBadge className="px-1.5 py-px text-[10px]" />
        Perfil e foto salvos de verdade no Supabase. Convite de usuários e permissões por módulo entram na Fase 4.
      </div>
    </div>
  );
}
