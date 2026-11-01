import type { Metadata } from "next";

import { CoachClientsPanel } from "@/components/coach/coach-clients-panel";

export const metadata: Metadata = { title: "Clients" };

export default function CoachClientsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-signal">
          Roster
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Clients
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Invite clients by email, track pending accepts, and review onboarding
          questionnaires.
        </p>
      </header>
      <div className="animate-rise stagger-1">
        <CoachClientsPanel />
      </div>
    </div>
  );
}
