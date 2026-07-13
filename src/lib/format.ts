import type { Enums } from "./supabase/database.types";

const currencySymbol: Record<Enums<"moeda">, string> = {
  BRL: "R$",
  USD: "US$",
  EUR: "€",
};

export function formatMoney(valor: number, moeda: Enums<"moeda"> = "BRL") {
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
  return `${currencySymbol[moeda]} ${formatted}`;
}

/** "BR" -> 🇧🇷 */
export function flagEmoji(pais: string) {
  if (!pais || pais.length !== 2) return "🏳";
  const codePoints = pais
    .toUpperCase()
    .split("")
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/** Diferença em dias entre hoje e uma data (positivo = futuro, negativo = passado). */
export function diffDays(dateStr: string, from = new Date()) {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** "amanhã", "hoje", "5 dias atrás", "em 12 dias", "10/07" para datas mais distantes. */
export function relativeDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = diffDays(dateStr);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  if (d > 1 && d <= 6) return `em ${d} dias`;
  if (d < -1 && d >= -6) return `${Math.abs(d)} dias atrás`;
  const [, m, day] = dateStr.split("-");
  return `${day}/${m}`;
}

/** Instante (timestamptz) -> "hoje", "ontem", "há N dias". */
export function relativeInteraction(iso: string | null) {
  if (!iso) return "—";
  const d = diffDays(iso.slice(0, 10));
  if (d === 0) return "hoje";
  if (d === -1) return "ontem";
  if (d < -1) return `há ${Math.abs(d)} dias`;
  return "hoje";
}

/** Segundos → "45min", "2h", "2h05" (usado em foco/meta de horas). */
export function formatDuracao(seg: number) {
  const h = Math.floor(seg / 3600);
  const m = Math.round((seg % 3600) / 60);
  if (h === 0) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
