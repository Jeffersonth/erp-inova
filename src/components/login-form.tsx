"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const features = [
  { icon: "✦", title: "Assistente que conhece seus clientes", sub: "responde e rascunha com os seus dados" },
  { icon: "↗", title: "Previsão de receita e risco de atraso", sub: "3 cenários de caixa para 90 dias" },
  { icon: "⟳", title: "Cobranças automáticas via Asaas", sub: "lembretes, retry de cartão e MRR" },
  { icon: "✍", title: "Contratos gerados por IA", sub: "preenchidos com os dados do projeto" },
];

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : error.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // signup
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setInfo("Conta criada! Verifique seu e-mail para confirmar antes de entrar.");
    setMode("signin");
  }

  async function withGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError("Login com Google ainda não configurado neste projeto.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060F1F] p-7 text-[13px]">
      <div className="absolute -left-[60px] -top-[90px] size-[420px] animate-blob-a rounded-full bg-[#1D5BFF] opacity-[.38] blur-[110px]" />
      <div className="absolute -bottom-[80px] -right-[40px] size-[360px] animate-blob-b rounded-full bg-[#00D1FF] opacity-[.22] blur-[110px]" />
      <div className="absolute bottom-[10%] left-[36%] size-[280px] animate-blob-c rounded-full bg-[#0E9F6E] opacity-[.18] blur-[110px]" />

      <div className="relative grid w-[880px] max-w-[96vw] animate-card-up grid-cols-1 overflow-hidden rounded-[20px] border border-white/[0.14] bg-white/[0.05] shadow-[0_40px_90px_rgba(0,0,0,.55)] backdrop-blur-[26px] md:grid-cols-[1.1fr_1fr]">
        {/* Branding */}
        <div className="hidden flex-col gap-5 border-r border-white/10 bg-gradient-to-br from-[#1D5BFF]/[0.16] to-[#00D1FF]/[0.04] p-[38px] text-soft md:flex">
          <div className="flex items-center gap-3">
            <div className="flex size-[46px] items-center justify-center rounded-[12px] bg-gradient-to-br from-[#1D5BFF] to-[#00D1FF] text-[18px] font-extrabold text-white shadow-[0_8px_24px_rgba(29,91,255,.45)]">
              in
            </div>
            <div>
              <div className="text-[17px] font-extrabold tracking-[-0.02em]">ERP Pessoal</div>
              <div className="text-[11px] text-[#8DA2C0]">por inova labs</div>
            </div>
          </div>
          <div className="max-w-[300px] text-[15px] font-semibold leading-[1.45]">
            Seu negócio inteiro em um só lugar —{" "}
            <span className="text-aqua">com IA em cada detalhe</span>.
          </div>
          <div className="mt-1.5 flex flex-col gap-[13px]">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-[11px]">
                <span className="flex size-[28px] flex-none items-center justify-center rounded-lg border border-aqua/30 bg-aqua/[0.12] text-[13px] text-aqua">
                  {f.icon}
                </span>
                <div className="text-[12px] leading-[1.5] text-[#B9C6DC]">
                  <b className="text-soft">{f.title}</b>
                  <br />
                  {f.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col gap-3.5 bg-[#060F1F]/40 p-[38px] text-soft">
          <div>
            <div className="text-[19px] font-extrabold tracking-[-0.01em]">
              {mode === "signin" ? "Bem-vindo de volta" : "Criar sua conta"}
            </div>
            <div className="mt-[3px] text-[12px] text-[#8DA2C0]">
              {mode === "signin" ? "Entre para continuar de onde parou." : "Leva menos de um minuto."}
            </div>
          </div>

          <label className="mt-1.5 flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[#8DA2C0]">E-mail</span>
            <div className="flex items-center gap-2.5 rounded-[10px] border border-white/[0.16] bg-white/[0.06] px-3.5 py-2.5 focus-within:border-brand">
              <span className="text-[13px] text-[#64748B]">✉</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com.br"
                className="min-w-0 flex-1 bg-transparent text-[12.5px] text-soft outline-none placeholder:text-[#64748B]"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[#8DA2C0]">Senha</span>
            <div className="flex items-center gap-2.5 rounded-[10px] border border-white/[0.16] bg-white/[0.06] px-3.5 py-2.5 focus-within:border-brand">
              <span className="text-[13px] text-[#64748B]">✱</span>
              <input
                type={showPwd ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="min-w-0 flex-1 bg-transparent text-[12.5px] text-soft outline-none placeholder:text-[#64748B]"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-[11px] font-semibold text-aqua"
              >
                {showPwd ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          {mode === "signin" && (
            <div className="flex items-center gap-2 text-[11.5px] text-[#8DA2C0]">
              <label className="flex cursor-pointer items-center gap-[7px]">
                <input type="checkbox" defaultChecked className="accent-brand" />
                Lembrar de mim
              </label>
              <a href="#" className="ml-auto font-semibold text-aqua">Esqueci a senha</a>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] text-red-300">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-aqua/40 bg-aqua/10 px-3 py-2 text-[11.5px] text-aqua">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-[10px] bg-gradient-to-br from-[#1D5BFF] to-[#00D1FF] p-3 text-[13px] font-bold text-white shadow-[0_12px_32px_rgba(29,91,255,.45)] transition hover:shadow-[0_14px_38px_rgba(0,209,255,.5)] disabled:opacity-60"
          >
            {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>

          <div className="flex items-center gap-2.5 text-[11px] text-[#64748B]">
            <div className="h-px flex-1 bg-white/[0.12]" />
            ou
            <div className="h-px flex-1 bg-white/[0.12]" />
          </div>

          <button
            type="button"
            onClick={withGoogle}
            className="flex items-center justify-center gap-2.5 rounded-[10px] border border-white/[0.16] bg-white/[0.06] p-[11px] text-[12.5px] font-semibold text-soft transition hover:border-white/40"
          >
            <span className="bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#34A853] bg-clip-text text-[13px] font-extrabold text-transparent">
              G
            </span>
            Continuar com Google
          </button>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "signin" ? "signup" : "signin"));
              setError(null);
              setInfo(null);
            }}
            className="text-center text-[11.5px] text-[#8DA2C0]"
          >
            {mode === "signin" ? (
              <>Não tem conta? <span className="font-semibold text-aqua">Criar conta</span></>
            ) : (
              <>Já tem conta? <span className="font-semibold text-aqua">Entrar</span></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
