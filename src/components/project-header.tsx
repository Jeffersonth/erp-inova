"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-providers";
import { atualizarStatusProjeto } from "@/lib/actions/projetos";
import { EditProjetoDialog, type EditableProjeto } from "@/components/edit-projeto-dialog";

export function ProjectHeader({
  projeto,
  clienteNome,
  metaLinha,
  clientes,
  finalizada,
}: {
  projeto: EditableProjeto;
  clienteNome: string | null;
  metaLinha: string;
  clientes: { id: string; nome: string }[];
  finalizada: boolean;
}) {
  const router = useRouter();
  const { toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function finalizar() {
    if (!confirm(`Finalizar o projeto "${projeto.titulo}"? Ele vai para a seção de projetos finalizados.`)) return;
    setLoading(true);
    await atualizarStatusProjeto(projeto.id, "concluido");
    setLoading(false);
    toast(`✓ Projeto "${projeto.titulo}" finalizado`);
    router.push("/projetos");
    router.refresh();
  }

  async function reabrir() {
    setLoading(true);
    await atualizarStatusProjeto(projeto.id, "dev");
    setLoading(false);
    toast(`✓ Projeto "${projeto.titulo}" reaberto`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 truncate text-[16px] font-extrabold tracking-[-0.01em] text-ink">
          {projeto.titulo}
          {finalizada && (
            <span className="flex-none rounded-full border border-ok/35 bg-ok/[0.08] px-2 py-px text-[11px] font-bold text-ok">
              ✓ finalizado
            </span>
          )}
        </h2>
        <div className="text-[12.5px] text-mut">
          {clienteNome ? `${clienteNome} · ` : ""}
          {metaLinha}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {finalizada ? (
          <button
            onClick={reabrir}
            disabled={loading}
            className="rounded-lg border border-line px-2.5 py-[5px] text-[12.5px] font-semibold text-ink transition-colors hover:border-brand disabled:opacity-60"
          >
            ↺ Reabrir
          </button>
        ) : (
          <button
            onClick={finalizar}
            disabled={loading}
            className="rounded-lg border border-ok/40 px-2.5 py-[5px] text-[12.5px] font-semibold text-ok transition-colors hover:bg-ok/10 disabled:opacity-60"
          >
            ✓ Finalizar projeto
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-[5px] text-[12.5px] font-semibold text-ink transition-colors hover:border-brand"
        >
          ✎ Editar
        </button>
      </div>

      <EditProjetoDialog
        projeto={editing ? projeto : null}
        clientes={clientes}
        onOpenChange={(open) => !open && setEditing(false)}
        onDeleted={() => router.push("/projetos")}
      />
    </div>
  );
}
