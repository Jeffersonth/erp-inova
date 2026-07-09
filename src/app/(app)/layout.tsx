import { AppSidebar } from "@/components/app-sidebar";
import { AppProviders } from "@/components/app-providers";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <div className="min-h-screen bg-background text-ink md:flex">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col gap-3 px-4 pb-7 pt-4 text-[13px] leading-[1.45] md:px-[22px] md:pt-[18px]">
          {children}
        </main>
      </div>
    </AppProviders>
  );
}
