export type JourneyGain = {
  id: string;
  titulo: string;
  valor_centavos: number | string;
  data: string;
  origem: string;
  notas: string;
};
export type JourneyGoal = {
  id: string;
  titulo: string;
  alvo_centavos: number | string;
  tipo: "marco" | "mensal";
  mes: string | null;
  prazo: string | null;
  concluido_em: string | null;
};
export const MILLION = 100_000_000;
export const MONTHLY_DEFAULT = 1_000_000;
export const journeyUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function toCents(value: unknown): number | null {
  if (
    typeof value !== "string" ||
    !/^\d{1,10}([.,]\d{1,2})?$/.test(value.trim())
  )
    return null;
  const [whole, fraction = ""] = value.trim().replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 999_999_999_999
    ? cents
    : null;
}
export const journeyMoney = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(cents / 100);
export const goalPercent = (current: number, target: number) =>
  Math.min(100, Math.max(0, (current / target) * 100));
export function monthEnd(month: string) {
  return new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
}
export function journeySummary(
  gains: JourneyGain[],
  goals: JourneyGoal[],
  today: string,
) {
  const sorted = [...gains]
    .filter((g) => g.data <= today)
    .sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
  const total = sorted.reduce((s, g) => s + Number(g.valor_centavos), 0);
  const month = today.slice(0, 7) + "-01";
  const months = new Set([
    month,
    ...sorted.map((g) => g.data.slice(0, 7) + "-01"),
  ]);
  const combined = [...goals];
  for (const m of Array.from(months))
    if (!goals.some((g) => g.tipo === "mensal" && g.mes === m))
      combined.push({
        id: `monthly:${m}`,
        titulo: "Meta do mês",
        alvo_centavos: MONTHLY_DEFAULT,
        tipo: "mensal",
        mes: m,
        prazo: null,
        concluido_em: null,
      });
  const enriched = combined.map((goal) => {
    const relevant =
      goal.tipo === "mensal"
        ? sorted.filter((g) => g.data.slice(0, 7) === goal.mes?.slice(0, 7))
        : sorted;
    let sum = 0;
    let crossing: string | null = null;
    for (const gain of relevant) {
      sum += Number(gain.valor_centavos);
      if (!crossing && sum >= Number(goal.alvo_centavos)) crossing = gain.data;
    }
    const completed = goal.concluido_em || crossing;
    return {
      ...goal,
      current: sum,
      percent: goalPercent(sum, Number(goal.alvo_centavos)),
      completed,
      manual: Boolean(goal.concluido_em),
      expired:
        !completed &&
        goal.tipo === "mensal" &&
        Boolean(goal.mes && goal.mes < month),
    };
  });
  const active = enriched
    .filter((g) => !g.completed && !g.expired)
    .sort(
      (a, b) =>
        a.tipo.localeCompare(b.tipo) ||
        Number(a.alvo_centavos) - Number(b.alvo_centavos),
    );
  const achieved = enriched
    .filter((g) => g.completed)
    .sort((a, b) => b.completed!.localeCompare(a.completed!));
  const monthly = enriched.find((g) => g.tipo === "mensal" && g.mes === month)!;
  const next =
    enriched
      .filter((g) => g.tipo === "marco" && !g.completed)
      .sort((a, b) => Number(a.alvo_centavos) - Number(b.alvo_centavos))[0] ??
    null;
  const series = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(
      Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 6 + i, 1),
    );
    const key = date.toISOString().slice(0, 7);
    return {
      month: key,
      label: new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
        month: "short",
      })
        .format(date)
        .replace(".", ""),
      value: sorted
        .filter((g) => g.data.startsWith(key))
        .reduce((s, g) => s + Number(g.valor_centavos), 0),
    };
  });
  return {
    total,
    monthly,
    next,
    active,
    achieved,
    expired: enriched.filter((g) => g.expired),
    all: enriched,
    series,
    percent: goalPercent(total, MILLION),
  };
}
