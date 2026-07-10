"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-providers";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/supabase/database.types";

type StatusCriavel = Extract<Enums<"cliente_status">, "lead" | "cliente">;

type Empresa = {
  cnpj: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacao: string | null;
  atividade: string | null;
  porte: string | null;
  capital: number | null;
  telefone: string | null;
  email: string | null;
  municipio: string | null;
  uf: string | null;
  endereco: string | null;
  abertura: string | null;
  socios: string[];
};

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function ProspeccaoCnpj() {
  const router = useRouter();
  const { toast } = useApp();
  const supabase = createClient();

  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [criando, setCriando] = useState<StatusCriavel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [criado, setCriado] = useState<StatusCriavel | null>(null);

  async function buscar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEmpresa(null);
    setCriado(null);
    setLoading(true);
    try {
      const res = await fetch("/api/prospeccao/cnpj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível consultar.");
        return;
      }
      setEmpresa(data as Empresa);
    } catch {
      setErro("Erro de conexão ao consultar o CNPJ.");
    } finally {
      setLoading(false);
    }
  }

  async function criar(status: StatusCriavel) {
    if (!empresa) return;
    setCriando(status);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast("Sessão expirada — faça login novamente.");
      setCriando(null);
      return;
    }
    const { error } = await supabase.from("clientes").insert({
      user_id: user.id,
      nome: empresa.nomeFantasia || empresa.razaoSocial || "Empresa",
      contato_nome: empresa.socios[0] ?? null,
      email: empresa.email,
      telefone: empresa.telefone,
      pais: "BR",
      ramo: empresa.atividade ? empresa.atividade.slice(0, 40) : null,
      status,
      cnpj_vat: formatCnpj(empresa.cnpj),
      endereco: empresa.endereco,
      origem: "Prospecção CNPJ",
    });
    setCriando(null);
    if (error) {
      toast(status === "cliente" ? "Não foi possível criar o cliente." : "Não foi possível criar o lead.");
      return;
    }
    setCriado(status);
    toast(status === "cliente" ? "✓ Cliente criado no CRM" : "✓ Lead criado no CRM");
    router.refresh();
  }

  const row = "flex gap-2 border-t border-line py-1.5 text-[12px] first:border-t-0";
  const lbl = "w-[110px] flex-none text-mut";

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={buscar} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-3">
        <input
          value={cnpj}
          onChange={(e) => setCnpj(formatCnpj(e.target.value))}
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
          className="min-w-0 flex-1 basis-[220px] rounded-lg border border-line bg-soft px-3 py-2 text-[13px] tabular-nums text-ink outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Consultando…" : "Consultar CNPJ"}
        </button>
        <span className="basis-full text-[10.5px] text-mut">Dados públicos da Receita Federal via BrasilAPI.</span>
      </form>

      {erro && (
        <div className="rounded-xl border border-danger/40 bg-danger/[0.06] px-3.5 py-2.5 text-[12px] text-danger">
          {erro}
        </div>
      )}

      {empresa && (
        <div className="rounded-xl border border-line bg-card px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[13px] text-ink">{empresa.nomeFantasia || empresa.razaoSocial}</b>
            {empresa.situacao && (
              <span
                className={`rounded-full border px-2 py-px text-[10.5px] font-semibold ${
                  empresa.situacao.toUpperCase() === "ATIVA"
                    ? "border-ok/35 bg-ok/[0.08] text-ok"
                    : "border-warn/35 bg-warn/[0.08] text-warn"
                }`}
              >
                {empresa.situacao}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => criar("lead")}
                disabled={!!criando || !!criado}
                className="rounded-lg border border-brand px-3.5 py-[7px] text-xs font-semibold text-brand transition-colors hover:bg-brand/10 disabled:opacity-60"
              >
                {criado === "lead" ? "✓ Lead criado" : criando === "lead" ? "Criando…" : "+ Criar lead"}
              </button>
              <button
                onClick={() => criar("cliente")}
                disabled={!!criando || !!criado}
                className="rounded-lg bg-brand px-3.5 py-[7px] text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {criado === "cliente" ? "✓ Cliente criado" : criando === "cliente" ? "Criando…" : "+ Criar cliente"}
              </button>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <div>
              {empresa.razaoSocial && <div className={row}><span className={lbl}>Razão social</span><span className="text-ink">{empresa.razaoSocial}</span></div>}
              <div className={row}><span className={lbl}>CNPJ</span><span className="text-ink">{formatCnpj(empresa.cnpj)}</span></div>
              {empresa.atividade && <div className={row}><span className={lbl}>Atividade</span><span className="text-ink">{empresa.atividade}</span></div>}
              {empresa.porte && <div className={row}><span className={lbl}>Porte</span><span className="text-ink">{empresa.porte}</span></div>}
              {empresa.capital != null && (
                <div className={row}>
                  <span className={lbl}>Capital</span>
                  <span className="text-ink">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(empresa.capital)}</span>
                </div>
              )}
            </div>
            <div>
              {empresa.telefone && <div className={row}><span className={lbl}>Telefone</span><span className="text-ink">{empresa.telefone}</span></div>}
              {empresa.email && <div className={row}><span className={lbl}>E-mail</span><span className="truncate text-ink">{empresa.email}</span></div>}
              {empresa.endereco && <div className={row}><span className={lbl}>Endereço</span><span className="text-ink">{empresa.endereco}</span></div>}
              {empresa.abertura && <div className={row}><span className={lbl}>Abertura</span><span className="text-ink">{empresa.abertura.split("-").reverse().join("/")}</span></div>}
              {empresa.socios.length > 0 && <div className={row}><span className={lbl}>Sócios</span><span className="text-ink">{empresa.socios.join(", ")}</span></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
