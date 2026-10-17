"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IaBadge } from "./ia-badge";

export type DraftSpec = { tipo: "cobranca" | "mensagem_cliente"; clienteId: string; recebimentoId?: string };

type ActiveDraft = { title: string; telefone?: string | null };

/** Monta o link wa.me a partir de um telefone BR (adiciona 55 se faltar). */
function whatsappLink(telefone: string, mensagem: string) {
  let d = telefone.replace(/\D/g, "");
  if (!d.startsWith("55") && d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensagem)}`;
}

type Ctx = {
  openAiDraft: (spec: DraftSpec, fallbackTitle: string) => void;
  toast: (msg: string) => void;
};
const AppCtx = React.createContext<Ctx | null>(null);

export function useApp() {
  const ctx = React.useContext(AppCtx);
  if (!ctx) throw new Error("useApp deve ser usado dentro de <AppProviders>");
  return ctx;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState<ActiveDraft | null>(null);
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setToastMsg(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const openAiDraft = React.useCallback(async (spec: DraftSpec, fallbackTitle: string) => {
    setActive({ title: fallbackTitle });
    setEditing(false);
    setLoading(true);
    setText("");
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      setActive({ title: data.title ?? fallbackTitle, telefone: data.telefone ?? null });
      setText(data.body);
    } catch {
      showToast("Não foi possível gerar o rascunho. Tente novamente.");
      setActive(null);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const approve = () => {
    setActive(null);
    showToast("✓ Enviado e registrado no histórico do cliente");
  };

  return (
    <AppCtx.Provider value={{ openAiDraft, toast: showToast }}>
      {children}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="w-[480px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[480px]">
          {active && (
            <>
              <DialogTitle className="pr-6 text-[15.5px] font-bold text-ink">
                {active.title}
              </DialogTitle>
              <div className="mb-2.5 mt-2.5 flex items-center gap-2">
                <IaBadge />
                <span className="text-[12px] text-mut">
                  Gerado por IA · revise antes de enviar
                </span>
              </div>
              {loading ? (
                <div className="flex min-h-[150px] items-center justify-center rounded-[10px] border border-line bg-soft p-3 text-[13.5px] italic text-mut">
                  Gerando rascunho…
                </div>
              ) : editing ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[150px] w-full resize-y rounded-[10px] border border-brand bg-soft p-3 text-[13.5px] leading-[1.55] text-ink outline-none"
                />
              ) : (
                <div className="whitespace-pre-wrap rounded-[10px] border border-line bg-soft p-3 text-[13.5px] leading-[1.55] text-ink">
                  {text}
                </div>
              )}
              <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => setEditing((v) => !v)}
                  disabled={loading}
                  className="rounded-lg border border-line px-3.5 py-[7px] text-[13px] font-semibold text-ink transition-colors hover:border-brand disabled:opacity-50"
                >
                  {editing ? "Salvar edição" : "Editar"}
                </button>
                {active.telefone && (
                  <a
                    href={whatsappLink(active.telefone, text)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => showToast("Abrindo o WhatsApp com a mensagem…")}
                    className={`rounded-lg border border-[#25D366] px-3.5 py-[7px] text-[13px] font-semibold text-[#128C3E] transition-colors hover:bg-[#25D366]/10 ${
                      loading ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    Enviar no WhatsApp
                  </a>
                )}
                <button
                  onClick={approve}
                  disabled={loading}
                  className="rounded-lg bg-brand px-4 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
                >
                  ✓ Aprovar e enviar
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {toastMsg && (
        <div className="animate-toast-in fixed bottom-[22px] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-[10px] bg-navy px-[18px] py-2.5 text-[13.5px] font-semibold text-soft shadow-[0_10px_30px_rgba(20,13,36,.35)]">
          <span className="text-aqua">✓</span> {toastMsg}
        </div>
      )}
    </AppCtx.Provider>
  );
}
