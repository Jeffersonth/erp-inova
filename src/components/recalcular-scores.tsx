"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-providers";

export function RecalcularScores() {
  const router = useRouter();
  const { toast } = useApp();
  const [loading, setLoading] = useState(false);

  async function recalcular() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/recalcular", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "erro");
      toast(`✓ Scores recalculados (${data.atualizados ?? 0} clientes)`);
      router.refresh();
    } catch {
      toast("Não foi possível recalcular os scores.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={recalcular}
      disabled={loading}
      title="Recalcula o score e a próxima ação de cada cliente a partir dos dados reais"
      className="rounded-lg border border-aqua/45 px-3 py-1.5 text-[13px] font-semibold text-ia transition-colors hover:bg-aqua/10 disabled:opacity-60"
    >
      {loading ? "Recalculando…" : "✦ Recalcular scores (IA)"}
    </button>
  );
}
