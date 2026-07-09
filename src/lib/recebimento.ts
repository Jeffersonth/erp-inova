import type { Tone } from "@/lib/mock-data";

/** Situação de pagamento derivada de valor total x valor pago. */
export function pagamentoInfo(valor: number, valorPago: number): {
  status: "pago" | "parcial" | "pendente";
  label: string;
  tone: Tone;
  saldo: number;
} {
  const saldo = Math.max(0, valor - valorPago);
  if (valorPago >= valor && valor > 0) return { status: "pago", label: "Pago", tone: "ok", saldo: 0 };
  if (valorPago > 0) return { status: "parcial", label: "Parcial", tone: "amber", saldo };
  return { status: "pendente", label: "Pendente", tone: "danger", saldo };
}
