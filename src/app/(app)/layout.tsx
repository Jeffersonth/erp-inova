import { AppSidebar } from "@/components/app-sidebar";
import { AppProviders } from "@/components/app-providers";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <div className="flex min-h-screen bg-background text-ink">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col gap-3 px-[22px] pb-7 pt-[18px] text-[13px] leading-[1.45]">
          {children}
        </main>
      </div>
    </AppProviders>
  );
}
