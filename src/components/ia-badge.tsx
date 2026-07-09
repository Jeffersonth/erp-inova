import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Selo "IA" usado em tudo que é gerado por inteligência artificial.
 *  Aceita `children` para reaproveitar o estilo em pílulas (ex: tipo de arquivo classificado pela IA). */
export function IaBadge({
  className,
  children = "IA",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center rounded-full border border-aqua/45 bg-aqua/10 px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.08em] text-ia",
        className,
      )}
    >
      {children}
    </span>
  );
}
