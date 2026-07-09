"use client";

import { useApp, type DraftSpec } from "./app-providers";
import { cn } from "@/lib/utils";

export function AiDraftButton({
  spec,
  fallbackTitle,
  label,
  solid,
  className,
}: {
  spec: DraftSpec;
  fallbackTitle: string;
  label: string;
  solid?: boolean;
  className?: string;
}) {
  const { openAiDraft } = useApp();
  return (
    <button
      onClick={() => openAiDraft(spec, fallbackTitle)}
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
