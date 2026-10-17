import Image from "next/image";

export function AppLogo({ className = "w-[168px]", variant = "light", compact = false }: { className?: string; variant?: "light" | "dark"; compact?: boolean }) {
  return <Image src={`/brand/logo-${compact ? "compact-" : ""}${variant}.svg`} alt={compact ? "ERP Pessoal" : "ERP Pessoal · por Jefferson Thales"} width={920} height={200} className={`h-auto max-w-full ${className}`} unoptimized priority />;
}

export function AppIcon({ className = "size-[30px]" }: { className?: string }) {
  return <Image src="/brand/icon.svg" alt="ERP Pessoal" width={512} height={512} className={`shrink-0 ${className}`} unoptimized priority />;
}
