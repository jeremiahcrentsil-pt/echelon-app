import { AppSidebar, MobileHeader } from "@/components/layout/app-nav";
import { ClientContextBar } from "@/components/layout/client-context-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-0 flex min-h-full flex-1 flex-col lg:flex-row">
      <MobileHeader />
      <AppSidebar />
      <main className="relative z-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <ClientContextBar />
        {children}
      </main>
    </div>
  );
}
