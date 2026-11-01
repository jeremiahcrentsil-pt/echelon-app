import type { Metadata } from "next";

import { OnboardingQuestionnaire } from "@/components/questionnaires/onboarding-questionnaire";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <div className="relative z-0 mx-auto flex min-h-full max-w-xl flex-1 flex-col px-4 py-10 sm:px-6">
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-signal">
          Welcome
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Onboarding
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Complete this short questionnaire so your coach can build the right
          plan. You’ll unlock the full app afterward.
        </p>
      </header>
      <OnboardingQuestionnaire />
    </div>
  );
}
