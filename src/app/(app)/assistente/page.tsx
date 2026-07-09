"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IaBadge } from "@/components/ia-badge";
import { useApp } from "@/components/app-providers";
import { chips, replies } from "@/lib/mock-data";

type Msg = { who: "user" | "ai"; text: string; actions?: { label: string; draft?: string; href?: string }[] };

function matchKey(input: string): string {
  const v = input.toLowerCase();
  if (v.includes("cobr")) return "cobrar";
  if (v.includes("fatur") || v.includes("recebi") || v.includes("mês") || v.includes("mes")) return "faturamento";
  if (v.includes("nordic") || v.includes("follow")) return "nordic";
  if (v.includes("risco") || v.includes("projeto") || v.includes("atras")) return "risco";
  return "fallback";
}

export default function AssistentePage() {
  const { openDraft } = useApp();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      who: "ai",
      text: "Oi Rafael! Posso responder sobre clientes, projetos e finanças — ou rascunhar mensagens para você aprovar. Experimente os atalhos acima.",
    },
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  function push(msgList: Msg[]) {
    setMsgs((prev) => [...prev, ...msgList]);
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }

  function ask(key: string, label: string) {
    const r = replies[key] ?? replies.fallback;
    push([{ who: "user", text: label }, { who: "ai", text: r.text, actions: r.actions }]);
  }

  function sendFree() {
    const v = input.trim();
    if (!v) return;
    setInput("");
    const r = replies[matchKey(v)] ?? replies.fallback;
    push([{ who: "user", text: v }, { who: "ai", text: r.text, actions: r.actions }]);
  }

  return (
    <div className="flex h-[calc(100vh-52px)] flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Assistente</h1>
        <IaBadge className="px-2 py-[3px]" />
        <span className="text-[11.5px] text-mut">
          responde com seus dados · toda ação vira rascunho para você aprovar
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => ask(c.key, c.label)}
            className="rounded-full border border-line bg-card px-3 py-1.5 text-[11.5px] font-semibold text-ink transition-colors hover:border-aqua"
          >
            {c.label}
          </button>
        ))}
      </div>

      <div
        ref={logRef}
        className="thin-scroll flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-line bg-card p-4"
      >
        {msgs.map((m, i) =>
          m.who === "user" ? (
            <div
              key={i}
              className="max-w-[70%] self-end rounded-[12px_12px_3px_12px] bg-brand px-3 py-2.5 text-[12.5px] leading-[1.5] text-white"
            >
              {m.text}
            </div>
          ) : (
            <div
              key={i}
              className="max-w-[80%] self-start rounded-[12px_12px_12px_3px] border border-line bg-soft px-3 py-2.5"
            >
              <IaBadge className="px-1.5 py-px text-[9px]" />
              <div className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-[1.55] text-ink">{m.text}</div>
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.actions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => (a.draft ? openDraft(a.draft) : a.href ? router.push(a.href) : undefined)}
                      className="rounded-lg bg-brand px-3 py-[5px] text-[11.5px] font-semibold text-white transition-colors hover:bg-brand-dark"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendFree()}
          placeholder="Pergunte sobre clientes, projetos ou finanças…"
          className="flex-1 rounded-[10px] border border-line bg-card px-3.5 py-2.5 text-[12.5px] text-ink outline-none focus:border-brand"
        />
        <button
          onClick={sendFree}
          className="rounded-[10px] bg-brand px-[18px] py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Enviar ➤
        </button>
      </div>
    </div>
  );
}
