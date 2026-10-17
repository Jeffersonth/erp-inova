"use client";
import { useState, type FormEvent } from "react";
import { passwordChangeError } from "@/lib/auth/password-policy";

export function ChangePasswordForm() {
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [done,setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || done) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const input = { currentPassword: fields.get("currentPassword"), newPassword: fields.get("newPassword"), confirmation: fields.get("confirmation") };
    const invalid = passwordChangeError(input.currentPassword,input.newPassword,input.confirmation);
    if (invalid) { setError(invalid); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/change-password",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error || "Não foi possível alterar. Entre novamente antes de tentar outra vez."); return; }
      form.reset(); setDone(true);
    } catch { setError("Não foi possível confirmar a troca. Entre novamente para verificar qual senha está válida."); }
    finally { setBusy(false); }
  }
  const field = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink focus:ring-2 focus:ring-brand";
  return <section className="erp-card erp-card--lavender p-4" aria-labelledby="password-title">
    <h2 id="password-title" className="font-bold text-ink">Alterar senha</h2>
    <p className="mt-1 text-xs text-mut">Confirme sua senha atual. Depois da troca, todos os dispositivos precisarão entrar novamente.</p>
    {done ? <div role="status" className="mt-4 rounded-xl border border-ok/30 bg-white p-4"><p className="font-semibold text-ok">Senha alterada. Suas sessões foram encerradas.</p><a href="/login" className="mt-3 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Entrar com a nova senha</a></div> : <form onSubmit={submit} className="mt-4 max-w-lg space-y-3">
      <fieldset disabled={busy} className="min-w-0 space-y-3">
        <label className="block text-xs font-semibold text-mut">Senha atual<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={1024} className={field}/></label>
        <label className="block text-xs font-semibold text-mut">Nova senha<input name="newPassword" type="password" autoComplete="new-password" required minLength={15} maxLength={72} className={field} aria-describedby="password-help"/></label>
        <label className="block text-xs font-semibold text-mut">Confirme a nova senha<input name="confirmation" type="password" autoComplete="new-password" required minLength={15} maxLength={72} className={field}/></label>
        <p id="password-help" className="text-xs text-mut">Use pelo menos 15 caracteres, com uma frase longa ou uma senha exclusiva gerada pelo seu gerenciador de senhas. Espaços são permitidos.</p>
        <button type="submit" disabled={busy} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Alterando…" : "Alterar senha e encerrar sessões"}</button>
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>}
  </section>;
}
