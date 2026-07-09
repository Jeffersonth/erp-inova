"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { drafts as draftCatalog } from "@/lib/mock-data";
import { IaBadge } from "./ia-badge";

type Ctx = { openDraft: (key: string) => void; toast: (msg: string) => void };
const AppCtx = React.createContext<Ctx | null>(null);

export function useApp() {
  const ctx = React.useContext(AppCtx);
  if (!ctx) throw new Error("useApp deve ser usado dentro de <AppProviders>");
  return ctx;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [draftKey, setDraftKey] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState("");
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const draft = draftKey ? draftCatalog[draftKey] : null;

  const showToast = React.useCallback((msg: string) => {
    setToastMsg(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const openDraft = React.useCallback((key: string) => {
    const d = draftCatalog[key];
    if (!d) return;
    setDraftKey(key);
    setEditing(false);
    setText(d.body);
  }, []);

  const approve = () => {
    const done = draft?.done ?? "✓ Enviado e registrado no histórico do cliente";
    setDraftKey(null);
    showToast(done);
  };

  return (
    <AppCtx.Provider value={{ openDraft, toast: showToast }}>
      {children}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraftKey(null)}>
        <DialogContent className="w-[480px] max-w-[92vw] gap-0 rounded-[14px] border-line p-5 sm:max-w-[480px]">
          {draft && (
            <>
              <DialogTitle className="pr-6 text-[14.5px] font-bold text-ink">
                {draft.title}
              </DialogTitle>
              <div className="mb-2.5 mt-2.5 flex items-center gap-2">
                <IaBadge />
                <span className="text-[11px] text-mut">
                  Gerado por IA · revise antes de enviar
                </span>
              </div>
              {editing ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[150px] w-full resize-y rounded-[10px] border border-brand bg-soft p-3 text-[12.5px] leading-[1.55] text-ink outline-none"
                />
              ) : (
                <div className="whitespace-pre-wrap rounded-[10px] border border-line bg-soft p-3 text-[12.5px] leading-[1.55] text-ink">
                  {text}
                </div>
              )}
              <div className="mt-3.5 flex justify-end gap-2">
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="rounded-lg border border-line px-3.5 py-[7px] text-xs font-semibold text-ink transition-colors hover:border-brand"
                >
                  {editing ? "Salvar edição" : "Editar"}
                </button>
                <button
                  onClick={approve}
                  className="rounded-lg bg-brand px-4 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
                >
                  {draft.cta ?? "✓ Aprovar e enviar"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {toastMsg && (
        <div className="animate-toast-in fixed bottom-[22px] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-[10px] bg-navy px-[18px] py-2.5 text-[12.5px] font-semibold text-soft shadow-[0_10px_30px_rgba(10,26,51,.35)]">
          <span className="text-aqua">✓</span> {toastMsg}
        </div>
      )}
    </AppCtx.Provider>
  );
}
