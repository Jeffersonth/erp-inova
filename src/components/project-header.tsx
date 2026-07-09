"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditProjetoDialog, type EditableProjeto } from "@/components/edit-projeto-dialog";

export function ProjectHeader({
  projeto,
  clienteNome,
  metaLinha,
  clientes,
}: {
  projeto: EditableProjeto;
  clienteNome: string | null;
  metaLinha: string;
  clientes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-ink">{projeto.titulo}</h2>
        <div className="text-[11.5px] text-mut">
          {clienteNome ? `${clienteNome} · ` : ""}
          {metaLinha}
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="ml-auto flex items-center gap-1 rounded-lg border border-line px-2.5 py-[5px] text-[11.5px] font-semibold text-ink transition-colors hover:border-brand"
      >
        ✎ Editar projeto
      </button>

      <EditProjetoDialog
        projeto={editing ? projeto : null}
        clientes={clientes}
        onOpenChange={(open) => !open && setEditing(false)}
        onDeleted={() => router.push("/projetos")}
      />
    </div>
  );
}
