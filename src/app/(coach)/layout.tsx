import { CoachMobileHeader, CoachSidebar } from "@/components/layout/coach-nav";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-0 flex min-h-full flex-1 flex-col lg:flex-row">
      <CoachMobileHeader />
      <CoachSidebar />
      <main className="relative z-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
