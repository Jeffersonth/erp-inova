"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";

type Arquivo = { id: string; nome: string; storage_path: string; classificacao_ia: string | null };

const MAX_MB = 15;

function iconFor(nome: string) {
  const ext = nome.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext ?? "")) return "🖼";
  if (["doc", "docx"].includes(ext ?? "")) return "📝";
  return "📎";
}

function tipoFor(nome: string) {
  const ext = nome.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext ?? "")) return "Imagem";
  if (["doc", "docx"].includes(ext ?? "")) return "Documento";
  return "Arquivo";
}

export function ArquivosBox({
  scope,
  ownerId,
  accept,
  titulo,
  ajuda,
  classificacaoPadrao,
}: {
  scope: "cliente" | "projeto";
  ownerId: string;
  accept: string;
  titulo: string;
  ajuda?: string;
  classificacaoPadrao?: string;
}) {
  const { toast } = useApp();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const coluna = scope === "cliente" ? "cliente_id" : "projeto_id";

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from("arquivos")
        .select("id, nome, storage_path, classificacao_ia")
        .eq(coluna, ownerId)
        .order("created_at", { ascending: false });
      if (ativo) {
        setArquivos((data as Arquivo[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`Arquivo muito grande (máx. ${MAX_MB} MB).`);
      return;
    }

    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast("Sessão expirada — faça login novamente.");
      setUploading(false);
      return;
    }

    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${scope}/${ownerId}/${Date.now()}-${safe}`;

    const { error: upErr } = await supabase.storage.from("arquivos").upload(path, file, { upsert: false });
    if (upErr) {
      toast("Falha no upload do arquivo.");
      setUploading(false);
      return;
    }

    const { data: row, error: insErr } = await supabase
      .from("arquivos")
      .insert({
        user_id: user.id,
        cliente_id: scope === "cliente" ? ownerId : null,
        projeto_id: scope === "projeto" ? ownerId : null,
        nome: file.name,
        storage_path: path,
        classificacao_ia: classificacaoPadrao ?? tipoFor(file.name),
      })
      .select("id, nome, storage_path, classificacao_ia")
      .single();

    setUploading(false);
    if (insErr || !row) {
      await supabase.storage.from("arquivos").remove([path]);
      toast("Não foi possível registrar o arquivo.");
      return;
    }
    setArquivos((prev) => [row as Arquivo, ...prev]);
    toast("✓ Arquivo anexado");
  }

  async function baixar(a: Arquivo) {
    const { data, error } = await supabase.storage.from("arquivos").createSignedUrl(a.storage_path, 60);
    if (error || !data) {
      toast("Não foi possível gerar o link de download.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function excluir(a: Arquivo) {
    if (!confirm(`Excluir "${a.nome}"?`)) return;
    setArquivos((prev) => prev.filter((x) => x.id !== a.id));
    await supabase.storage.from("arquivos").remove([a.storage_path]);
    await supabase.from("arquivos").delete().eq("id", a.id);
  }

  return (
    <div className="rounded-lg border border-line bg-soft px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10.5px] font-semibold text-mut">{titulo}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="ml-auto rounded-lg border border-line bg-card px-2.5 py-[5px] text-[11px] font-semibold text-ink transition-colors hover:border-brand disabled:opacity-60"
        >
          {uploading ? "Enviando…" : "+ Anexar"}
        </button>
        <input ref={inputRef} type="file" accept={accept} onChange={onPick} className="hidden" />
      </div>
      {ajuda && <div className="mt-1 text-[10.5px] text-mut">{ajuda}</div>}

      <div className="mt-2 flex flex-col gap-1">
        {loading ? (
          <div className="py-2 text-center text-[11.5px] text-mut">carregando…</div>
        ) : arquivos.length === 0 ? (
          <div className="py-2 text-center text-[11.5px] text-mut">nenhum arquivo ainda</div>
        ) : (
          arquivos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md border border-line bg-card px-2 py-1.5">
              <span className="text-[13px]">{iconFor(a.nome)}</span>
              <button
                type="button"
                onClick={() => baixar(a)}
                className="min-w-0 flex-1 truncate text-left text-[12px] text-ink hover:text-brand hover:underline"
                title="Baixar"
              >
                {a.nome}
              </button>
              {a.classificacao_ia && (
                <span className="flex-none rounded-full border border-line bg-soft px-1.5 py-px text-[10px] font-semibold text-mut">
                  {a.classificacao_ia}
                </span>
              )}
              <button
                type="button"
                onClick={() => excluir(a)}
                aria-label={`Excluir ${a.nome}`}
                title="Excluir"
                className="flex-none text-mut transition-colors hover:text-danger"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
