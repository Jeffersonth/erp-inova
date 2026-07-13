"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full mt-1 rounded-lg border border-line bg-soft px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand";

type Perfil = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  funcao: string | null;
  avatar_url: string | null;
  meta_horas_dia: number;
};

function iniciaisDe(nome: string) {
  return (
    nome
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function PerfilForm({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(perfil.nome);
  const [telefone, setTelefone] = useState(perfil.telefone ?? "");
  const [funcao, setFuncao] = useState(perfil.funcao ?? "");
  const [metaHoras, setMetaHoras] = useState(String(perfil.meta_horas_dia ?? 6));
  const [avatarUrl, setAvatarUrl] = useState(perfil.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function salvar() {
    setSaving(true);
    const meta = Math.min(24, Math.max(0.5, Number(metaHoras.replace(",", ".")) || 6));
    const { error } = await supabase
      .from("usuarios")
      .update({ nome, telefone: telefone || null, funcao: funcao || null, meta_horas_dia: meta })
      .eq("id", perfil.id);
    setSaving(false);

    if (error) {
      toast("Não foi possível salvar o perfil.");
      return;
    }
    toast(`✓ Perfil de ${nome.split(" ")[0]} salvo`);
    router.refresh();
  }

  async function onFotoSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${perfil.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      toast("Não foi possível enviar a foto.");
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("usuarios")
      .update({ avatar_url: url })
      .eq("id", perfil.id);

    setUploading(false);
    if (updateError) {
      toast("Foto enviada, mas não foi possível salvar no perfil.");
      return;
    }

    setAvatarUrl(url);
    toast("✓ Foto atualizada");
    router.refresh();
  }

  return (
    <>
      <div className="mt-3.5 flex flex-wrap items-start gap-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Alterar foto"
          disabled={uploading}
          className="relative flex size-[84px] flex-none items-center justify-center overflow-hidden rounded-full border-2 border-line bg-brand text-[27px] font-extrabold text-white disabled:opacity-70"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            iniciaisDe(nome)
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex size-[26px] items-center justify-center rounded-full border-2 border-card bg-navy text-[13px] text-aqua">
            {uploading ? "…" : "📷"}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFotoSelecionada} />

        <div className="grid flex-1 grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
          <div>
            <label className="text-[11.5px] font-semibold text-mut">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={field} />
          </div>
          <div>
            <label className="text-[11.5px] font-semibold text-mut">E-mail</label>
            <input value={perfil.email} disabled className={`${field} opacity-60`} />
          </div>
          <div>
            <label className="text-[11.5px] font-semibold text-mut">Telefone</label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className={field} />
          </div>
          <div>
            <label className="text-[11.5px] font-semibold text-mut">Função</label>
            <input value={funcao} onChange={(e) => setFuncao(e.target.value)} className={field} />
          </div>
          <div>
            <label className="text-[11.5px] font-semibold text-mut">Meta de foco por dia (horas)</label>
            <input
              value={metaHoras}
              onChange={(e) => setMetaHoras(e.target.value)}
              inputMode="decimal"
              placeholder="6"
              className={field}
            />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={saving}
          className="rounded-lg bg-brand px-3.5 py-[7px] text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Salvando…" : "✓ Salvar perfil"}
        </button>
        <span className="text-[12px] text-mut">
          A foto aparece na sidebar e nas mensagens enviadas pelo sistema.
        </span>
      </div>
    </>
  );
}
