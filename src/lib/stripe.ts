// Stripe (server-only) — assinaturas ativas e MRR reais.
// Lê STRIPE_SECRET_KEY do ambiente (nunca exposta ao browser). Sem a chave,
// ou em erro/timeout, retorna null e as telas caem no espelho local
// (tabela `assinaturas`) — a página nunca quebra.

export type StripeResumo = { mrr: number; ativas: number };

type StripeSubscription = {
  items?: {
    data?: {
      quantity?: number;
      price?: {
        unit_amount: number | null;
        recurring: { interval: "day" | "week" | "month" | "year"; interval_count: number } | null;
      } | null;
    }[];
  };
};

const FATOR_MENSAL: Record<string, number> = { day: 30, week: 4.345, month: 1, year: 1 / 12 };

export async function getStripeResumo(): Promise<StripeResumo | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://api.stripe.com/v1/subscriptions?status=active&limit=100", {
      headers: { Authorization: `Bearer ${key}` },
      // cache de 5 min — Dashboard e Financeiro compartilham a mesma resposta
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[stripe]", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { data?: StripeSubscription[] };
    const subs = json.data ?? [];

    let mrr = 0;
    for (const sub of subs) {
      for (const item of sub.items?.data ?? []) {
        const price = item.price;
        if (!price?.unit_amount || !price.recurring) continue;
        const fator = (FATOR_MENSAL[price.recurring.interval] ?? 1) / Math.max(1, price.recurring.interval_count);
        mrr += (price.unit_amount / 100) * (item.quantity ?? 1) * fator;
      }
    }
    return { mrr: Math.round(mrr), ativas: subs.length };
  } catch (err) {
    console.error("[stripe]", err);
    return null;
  }
}
