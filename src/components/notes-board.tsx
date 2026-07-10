"use client";

import { useState } from "react";
import { IaBadge } from "@/components/ia-badge";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";

export type NoteRow = {
  id: string;
  texto: string;
  tag: string | null;
  due: string | null;
  detected_by_ia: boolean;
  concluida: boolean;
};

type Note = { id: string; text: string; tag?: string | null; due: Date | null; detected: boolean; done: boolean };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (d: Date) => {
  const wd = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return `${wd[d.getDay()]} · ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function parseNatural(text: string, today: Date): Date | null {
  const low = text.toLowerCase();
  if (low.includes("hoje")) return today;
  if (low.includes("amanhã") || low.includes("amanha")) return addDays(today, 1);
  const wd: Record<string, number> = { domingo: 0, segunda: 1, terça: 2, terca: 2, quarta: 3, quinta: 4, sexta: 5, sábado: 6, sabado: 6 };
  for (const k in wd) {
    if (low.includes(k)) {
      const diff = ((wd[k] - today.getDay() + 7) % 7) || 7;
      return addDays(today, diff);
    }
  }
  const m = low.match(/(\d{1,2})\/(\d{1,2})/);
  if (m) {
    const d = new Date(today.getFullYear(), Number(m[2]) - 1, Number(m[1]));
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return startOfDay(d);
  }
  return null;
}

function fromRow(n: NoteRow): Note {
  return {
    id: n.id,
    text: n.texto,
    tag: n.tag,
    detected: n.detected_by_ia,
    done: n.concluida,
    due: n.due ? new Date(n.due + "T00:00:00") : null,
  };
}

export function NotesBoard({ initial }: { initial: NoteRow[] }) {
  const { toast } = useApp();
  const supabase = createClient();
  const today = startOfDay(new Date());

  const [notes, setNotes] = useState<Note[]>(initial.map(fromRow));
  const [input, setInput] = useState("");
  const [dateInput, setDateInput] = useState("");

  async function add() {
    if (!input.trim()) return;
    let due: Date | null = null;
    let detected = false;
    if (dateInput) {
      due = startOfDay(new Date(dateInput + "T00:00:00"));
    } else {
      due = parseNatural(input, today);
      detected = due != null;
    }
    const tag = input.toLowerCase().startsWith("ideia") ? "Ideia" : null;
    const texto = input.trim();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast("Sessão expirada — faça login novamente.");
      return;
    }

    const { data, error } = await supabase
      .from("anotacoes")
      .insert({ texto, tag, due: due ? toIso(due) : null, detected_by_ia: detected, user_id: user.id })
      .select()
      .single();

    if (error || !data) {
      toast("Não foi possível salvar a anotação.");
      return;
    }

    setNotes((prev) => [fromRow(data), ...prev]);
    toast(
      detected
        ? `IA detectou o prazo: ${due ? fmt(due) : ""}`
        : due
          ? "Anotação criada com prazo"
          : "Anotação salva — sem prazo, virou ideia",
    );
    setInput("");
    setDateInput("");
  }

  async function toggle(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const done = !note.done;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, done } : n)));
    await supabase.from("anotacoes").update({ concluida: done }).eq("id", id);
  }

  async function remove(id: string) {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    if (!confirm("Excluir esta anotação?")) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("anotacoes").delete().eq("id", id);
  }

  const sections = [
    { title: "🔥 Atrasadas", items: notes.filter((n) => !n.done && n.due && n.due < today) },
    { title: "📅 Hoje", items: notes.filter((n) => !n.done && n.due && sameDay(n.due, today)) },
    { title: "🗓 Próximas", items: notes.filter((n) => !n.done && n.due && n.due > today) },
    { title: "💡 Sem prazo", items: notes.filter((n) => !n.done && !n.due) },
    { title: "✔ Concluídas", items: notes.filter((n) => n.done) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Anotações</h1>
        <span className="text-[11.5px] text-mut">rápidas de escrever, impossíveis de esquecer</span>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-aqua/35 bg-gradient-to-r from-aqua/10 to-brand/[0.06] px-3.5 py-[11px]">
        <IaBadge className="mt-px" />
        <div className="text-[12px] text-mut">
          Escreva em linguagem natural — <b className="text-ink">&ldquo;cobrar Maria amanhã&rdquo;</b>, <b className="text-ink">&ldquo;enviar orçamento sexta&rdquo;</b>, <b className="text-ink">&ldquo;renovar domínio 15/07&rdquo;</b> — e eu detecto a data, crio o prazo e adiciono à sua agenda. Sem data, vira uma ideia.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="O que você precisa lembrar?"
          className="min-w-[200px] flex-1 rounded-[10px] border border-line bg-card px-3.5 py-2.5 text-[12.5px] text-ink outline-none focus:border-brand"
        />
        <input
          type="date"
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          className="flex-none rounded-[10px] border border-line bg-card px-3 py-2.5 text-[12px] text-mut outline-none focus:border-brand"
        />
        <button
          onClick={add}
          className="flex-none whitespace-nowrap rounded-[10px] bg-brand px-[18px] py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-brand-dark"
        >
          + Anotar
        </button>
      </div>

      {sections.map(
        (sec) =>
          sec.items.length > 0 && (
            <div key={sec.title}>
              <div className="mb-1.5 mt-0.5 text-[11px] font-bold tracking-[0.05em] text-mut">
                {sec.title} · {sec.items.length}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sec.items.map((n) => {
                  const atrasada = !n.done && n.due != null && n.due < today;
                  return (
                    <div
                      key={n.id}
                      className={`flex flex-col gap-2 rounded-xl border p-3 shadow-[0_1px_2px_rgba(10,26,51,.05)] transition-colors ${
                        n.done
                          ? "border-line bg-soft opacity-75"
                          : atrasada
                            ? "border-danger/35 bg-danger/[0.04] hover:border-danger/60"
                            : "border-line bg-card hover:border-brand/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggle(n.id)}
                          aria-label={n.done ? "Reabrir anotação" : "Concluir anotação"}
                          title={n.done ? "Reabrir" : "Concluir"}
                          className={`flex size-[17px] flex-none items-center justify-center rounded-full border text-[11px] ${
                            n.done ? "border-ok bg-ok text-white" : "border-line text-transparent hover:border-brand"
                          }`}
                        >
                          ✓
                        </button>
                        {n.tag && (
                          <span className="rounded-full border border-line bg-soft px-2 py-0.5 text-[10px] font-semibold text-mut">
                            {n.tag}
                          </span>
                        )}
                        {n.detected && !n.done && <IaBadge className="px-1.5 py-px text-[9px]">IA · prazo</IaBadge>}
                        <button
                          onClick={() => remove(n.id)}
                          aria-label="Excluir anotação"
                          title="Excluir"
                          className="ml-auto flex size-5 flex-none items-center justify-center rounded-md text-mut transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          ✕
                        </button>
                      </div>

                      <div
                        className={`min-h-[34px] text-[12.5px] leading-snug ${
                          n.done ? "text-mut line-through" : "text-ink"
                        }`}
                      >
                        {n.text}
                      </div>

                      <div className="mt-auto border-t border-dashed border-line pt-1.5">
                        {n.due ? (
                          <span className={`text-[11px] font-semibold ${atrasada ? "text-danger" : "text-mut"}`}>
                            {atrasada ? "⚠ " : "📅 "}
                            {fmt(n.due)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-mut">💡 sem prazo</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ),
      )}
    </div>
  );
}
