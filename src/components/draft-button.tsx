"use client";

import { useApp } from "./app-providers";
import { cn } from "@/lib/utils";

export function DraftButton({
  draftKey,
  label,
  solid,
  className,
}: {
  draftKey: string;
  label: string;
  solid?: boolean;
  className?: string;
}) {
  const { openDraft } = useApp();
  return (
    <button
      onClick={() => openDraft(draftKey)}
      className={cn(
        "flex-none whitespace-nowrap rounded-lg px-3 py-[5px] text-[11.5px] font-semibold transition-colors",
        solid
          ? "bg-brand text-white hover:bg-brand-dark"
          : "border border-line text-ink hover:border-brand",
        className,
      )}
    >
      {label}
    </button>
  );
}
