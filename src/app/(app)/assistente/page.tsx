"use client";

import { useRef, useState } from "react";
import { IaBadge } from "@/components/ia-badge";
import { useApp } from "@/components/app-providers";

type Msg = { who: "user" | "ai"; text: string };

const chips = [
  { key: "cobrar", label: "Quem devo cobrar?" },
  { key: "faturamento", label: "Quanto tenho a receber este mês?" },
  { key: "risco", label: "Algum projeto em risco de atraso?" },
  { key: "pendentes", label: "O que está pendente nas minhas anotações?" },
];

export default function AssistentePage() {
  const { toast } = useApp();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      who: "ai",
      text: "Oi Rafael! Posso consultar seus clientes, projetos, financeiro e anotações de verdade — e rascunhar mensagens para você aprovar. Experimente os atalhos acima ou pergunte algo.",
    },
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  function scrollToEnd() {
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { who: "user", text };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setInput("");
    setLoading(true);
    scrollToEnd();

    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.who === "ai" ? "assistant" : "user", content: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      setMsgs((prev) => [...prev, { who: "ai", text: data.text }]);
    } catch {
      toast("Não foi possível consultar o assistente. Tente novamente.");
      setMsgs((prev) => [...prev, { who: "ai", text: "Desculpa, tive um problema para responder. Tente de novo." }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }

  return (
    <div className="flex h-[calc(100dvh-104px)] flex-col gap-3 md:h-[calc(100dvh-52px)]">
      <div className="flex items-center gap-2.5">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Assistente</h1>
        <IaBadge className="px-2 py-[3px]" />
        <span className="text-[11.5px] text-mut">
          responde com seus dados de verdade · toda ação vira rascunho para você aprovar
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => send(c.label)}
            disabled={loading}
            className="rounded-full border border-line bg-card px-3 py-1.5 text-[11.5px] font-semibold text-ink transition-colors hover:border-aqua disabled:opacity-50"
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
            </div>
          ),
        )}
        {loading && (
          <div className="max-w-[80%] self-start rounded-[12px_12px_12px_3px] border border-line bg-soft px-3 py-2.5">
            <IaBadge className="px-1.5 py-px text-[9px]" />
            <div className="mt-1.5 text-[12.5px] italic text-mut">consultando seus dados…</div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Pergunte sobre clientes, projetos ou finanças…"
          disabled={loading}
          className="flex-1 rounded-[10px] border border-line bg-card px-3.5 py-2.5 text-[12.5px] text-ink outline-none focus:border-brand disabled:opacity-60"
        />
        <button
          onClick={() => send(input)}
          disabled={loading}
          className="rounded-[10px] bg-brand px-[18px] py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          Enviar ➤
        </button>
      </div>
    </div>
  );
}
