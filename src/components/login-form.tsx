"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OWNER_EMAIL } from "@/lib/auth/owner";
import { AppLogo } from "@/components/app-brand";

const features = [
  { icon: "✦", title: "Assistente que conhece seus clientes", sub: "responde e rascunha com os seus dados" },
  { icon: "↗", title: "Previsão de receita e risco de atraso", sub: "3 cenários de caixa para 90 dias" },
  { icon: "⟳", title: "Assinaturas e MRR via Stripe", sub: "receita recorrente direto da sua conta" },
  { icon: "✍", title: "Contratos gerados por IA", sub: "preenchidos com os dados do projeto" },
];

export function LoginForm({ googleEnabled = false, initialError }: { googleEnabled?: boolean; initialError?: string }) {
  const router = useRouter();

  const email = OWNER_EMAIL;
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (loading) return;
    setError(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { const body = await res.json().catch(() => null); setError(body?.error ?? "E-mail ou senha inválidos."); return; }
      router.push("/hoje"); router.refresh();
    } catch { setError("Não foi possível conectar. Tente novamente."); }
    finally { setLoading(false); }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#140D24] p-7 text-[14px]">
      <div className="absolute -left-[60px] -top-[90px] size-[420px] animate-blob-a rounded-full bg-[#EF2B91] opacity-[.26] blur-[110px]" />
      <div className="absolute -bottom-[80px] -right-[40px] size-[360px] animate-blob-b rounded-full bg-[#FF7939] opacity-[.19] blur-[110px]" />
      <div className="absolute bottom-[10%] left-[36%] size-[280px] animate-blob-c rounded-full bg-[#9C36B5] opacity-[.18] blur-[110px]" />

      <div className="relative grid w-[880px] max-w-[96vw] animate-card-up grid-cols-1 overflow-hidden rounded-[20px] border border-white/[0.14] bg-white/[0.05] shadow-[0_40px_90px_rgba(0,0,0,.55)] backdrop-blur-[26px] md:grid-cols-[1.1fr_1fr]">
        {/* Branding */}
        <div className="hidden flex-col gap-5 border-r border-white/10 bg-gradient-to-br from-[#EF2B91]/[0.12] to-[#FF7939]/[0.04] p-[38px] text-soft md:flex">
          <AppLogo className="w-[280px]" />
          <div className="max-w-[300px] text-[16px] font-semibold leading-[1.45]">
            Seu negócio inteiro em um só lugar —{" "}
            <span className="text-[#FF71B4]">com IA em cada detalhe</span>.
          </div>
          <div className="mt-1.5 flex flex-col gap-[13px]">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-[11px]">
                <span className="flex size-[28px] flex-none items-center justify-center rounded-lg border border-[#EF2B91]/30 bg-[#EF2B91]/[0.12] text-[14px] text-[#FF71B4]">
                  {f.icon}
                </span>
                <div className="text-[13px] leading-[1.5] text-[#C8BED6]">
                  <b className="text-soft">{f.title}</b>
                  <br />
                  {f.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col gap-3.5 bg-[#140D24]/40 p-[38px] text-soft">
          <div className="mb-2 md:hidden"><AppLogo className="w-[250px]" /></div>
          <div>
            <div className="text-[20px] font-extrabold tracking-[-0.01em]">Bem-vindo de volta</div>
            <div className="mt-[3px] text-[13px] text-[#B8AEC9]">Acesso exclusivo do administrador.</div>
          </div>

          {googleEnabled && <><a href="/api/auth/google" className="mt-1 flex items-center justify-center gap-2 rounded-[10px] border border-white/20 bg-white p-3 text-sm font-semibold text-[#20182D] transition hover:bg-white/90"><svg aria-hidden="true" viewBox="0 0 48 48" className="size-5"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.6c3.8-3.5 6.1-8.7 6.1-15.1Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.2c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.4a12.2 12.2 0 0 1 0-7.8v-5.3H5.8a20.3 20.3 0 0 0 0 18.4l6.8-5.3Z"/><path fill="#EA4335" d="M24 11.2c3 0 5.6 1 7.7 3l5.8-5.8A19.5 19.5 0 0 0 24 3a20.4 20.4 0 0 0-18.2 11.3l6.8 5.3A12 12 0 0 1 24 11.2Z"/></svg>Entrar com Google</a><div className="text-center text-xs text-[#B8AEC9]">ou use sua senha</div></>}
          <label className="mt-1.5 flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-[#B8AEC9]">E-mail</span>
            <div className="flex items-center gap-2.5 rounded-[10px] border border-white/[0.16] bg-white/[0.06] px-3.5 py-2.5 focus-within:border-[#EF2B91]">
              <span className="text-[14px] text-[#64748B]">✉</span>
              <input
                type="email"
                required
                value={email}
                readOnly
                autoComplete="username"
                aria-label="E-mail do administrador"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-soft outline-none placeholder:text-[#64748B]"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-[#B8AEC9]">Senha</span>
            <div className="flex items-center gap-2.5 rounded-[10px] border border-white/[0.16] bg-white/[0.06] px-3.5 py-2.5 focus-within:border-[#EF2B91]">
              <span className="text-[14px] text-[#64748B]">✱</span>
              <input
                type={showPwd ? "text" : "password"}
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-soft outline-none placeholder:text-[#64748B]"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-[12px] font-semibold text-[#FF71B4]"
              >
                {showPwd ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          <div className="flex items-center gap-2 text-[12.5px] text-[#B8AEC9]">
            <label className="flex cursor-pointer items-center gap-[7px]">
              <input type="checkbox" defaultChecked className="accent-[#EF2B91]" />
              Lembrar de mim
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-[10px] bg-gradient-to-r from-[#EF2B91] to-[#FF7939] p-3 text-[14px] font-bold text-white shadow-[0_12px_32px_rgba(239,43,145,.25)] transition hover:shadow-[0_14px_38px_rgba(239,43,145,.4)] disabled:opacity-60"
          >
            {loading ? "Aguarde…" : "Entrar"}
          </button>

          <div className="text-center text-[12px] text-[#64748B]">Acesso exclusivo de Jefferson Thales.</div>
        </form>
      </div>
    </div>
  );
}
