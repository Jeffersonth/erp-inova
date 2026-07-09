import { IaBadge } from "@/components/ia-badge";

const card = "rounded-xl border border-line bg-card";
const field =
  "w-full mt-1 rounded-lg border border-line bg-soft px-3 py-2 text-[12.5px] text-ink outline-none focus:border-brand";
const usersCols = "grid-cols-[1.4fr_1fr_2fr]";

export default function ConfiguracoesPage() {
  return (
    <div className="flex max-w-[840px] flex-col gap-3">
      <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Configurações</h1>

      {/* Usuário administrador */}
      <div className={`${card} px-[18px] py-4`}>
        <b className="text-[12.5px] text-ink">Usuário administrador</b>
        <div className="mt-3.5 flex flex-wrap items-start gap-5">
          <div className="relative flex size-[84px] flex-none items-center justify-center rounded-full border-2 border-line bg-brand text-[26px] font-extrabold text-white">
            RM
            <span className="absolute -bottom-0.5 -right-0.5 flex size-[26px] items-center justify-center rounded-full border-2 border-card bg-navy text-[12px] text-aqua">
              📷
            </span>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
            <div>
              <label className="text-[10.5px] font-semibold text-mut">Nome</label>
              <input defaultValue="Rafael M." className={field} />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-mut">E-mail</label>
              <input defaultValue="rafael@inovalabs.com.br" className={field} />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-mut">Telefone</label>
              <input defaultValue="+55 11 98765-4321" className={field} />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-mut">Função</label>
              <input defaultValue="Administrador · Dev freelancer" className={field} />
            </div>
          </div>
        </div>
        <div className="mt-2.5 text-[11px] text-mut">
          A foto aparece na sidebar e nas mensagens enviadas pelo sistema.
        </div>
      </div>

      {/* Usuários e permissões */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center gap-2 px-4 pb-2 pt-3">
          <b className="text-[12.5px] text-ink">Usuários e permissões</b>
          <button className="ml-auto rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-ink transition-colors hover:border-brand">
            + Convidar usuário
          </button>
        </div>
        <div className={`grid ${usersCols} gap-2 border-b border-line px-4 py-2 text-[10px] font-semibold tracking-[0.07em] text-mut`}>
          <span>USUÁRIO</span>
          <span>PAPEL</span>
          <span>MÓDULOS</span>
        </div>
        <div className={`grid ${usersCols} items-center gap-2 border-b border-line px-4 py-2.5 text-[12px]`}>
          <div>
            <b className="text-ink">Rafael M.</b>
            <div className="text-[10.5px] text-mut">rafael@inovalabs.com.br</div>
          </div>
          <span className="text-[11px] font-bold text-brand">Administrador</span>
          <div>
            <span className="rounded-full border border-line bg-soft px-2 py-0.5 text-[10px] font-semibold text-mut">
              Todos os módulos
            </span>
          </div>
        </div>
        <div className={`grid ${usersCols} items-center gap-2 px-4 py-2.5 text-[12px]`}>
          <div>
            <b className="text-ink">Cléa Contábil</b>
            <div className="text-[10.5px] text-mut">clea@contabil.com.br</div>
          </div>
          <span className="text-[11px] font-bold text-mut">Convidada</span>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-line bg-soft px-2 py-0.5 text-[10px] font-semibold text-mut">
              Financeiro · leitura
            </span>
            <span className="rounded-full border border-line bg-soft px-2 py-0.5 text-[10px] font-semibold text-mut">
              Notas fiscais · edição
            </span>
          </div>
        </div>
      </div>

      {/* Integrações */}
      <div className={`${card} flex flex-col px-4 py-3`}>
        <b className="text-[12.5px] text-ink">Integrações</b>

        <div className="mt-1.5 flex items-center gap-2.5 border-b border-line py-2.5">
          <span className="flex size-[30px] flex-none items-center justify-center rounded-lg border border-line bg-soft text-[12px] font-extrabold text-brand">
            A
          </span>
          <div>
            <b className="text-[12px] text-ink">Asaas</b>
            <div className="text-[11px] text-mut">cobranças, assinaturas e retry de cartão</div>
          </div>
          <span className="ml-auto text-[11px] font-bold text-ok">● Conectado</span>
        </div>

        <div className="flex items-center gap-2.5 border-b border-line py-2.5">
          <span className="flex size-[30px] flex-none items-center justify-center rounded-lg border border-aqua/45 bg-aqua/10 text-[12px] font-extrabold text-ia">
            ✦
          </span>
          <div>
            <b className="text-[12px] text-ink">Motor de IA</b>
            <div className="text-[11px] text-mut">rascunhos, scores, previsões e detecção de prazos</div>
          </div>
          <span className="ml-auto text-[11px] font-bold text-ok">● Conectado</span>
        </div>

        <div className="flex items-center gap-2.5 py-2.5">
          <span className="flex size-[30px] flex-none items-center justify-center rounded-lg border border-line bg-soft text-[12px] font-extrabold text-ok">
            W
          </span>
          <div>
            <b className="text-[12px] text-ink">WhatsApp Business</b>
            <div className="text-[11px] text-mut">enviar cobranças e follow-ups aprovados</div>
          </div>
          <button className="ml-auto rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:border-brand">
            Conectar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 text-[11px] text-mut">
        <IaBadge className="px-1.5 py-px text-[9px]" />
        Fase 1 · dados de exemplo. Auth, RLS e persistência entram com o Supabase nas próximas fases.
      </div>
    </div>
  );
}
