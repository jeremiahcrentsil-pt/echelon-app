"use client";

import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";

import { loadActiveClientId } from "@/lib/data/clients";
import {
  loadWorkoutPlans,
  plansForClient,
  type WorkoutPlan,
} from "@/lib/data/workout-plans";

export function AssignedPlanCard() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    try {
      const clientId = loadActiveClientId();
      setPlans(plansForClient(loadWorkoutPlans(), clientId));
    } catch {
      setPlans([]);
    }
  }, []);

  if (plans.length === 0) return null;

  return (
    <section className="mb-8 space-y-3 animate-rise">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5"
        >
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Dumbbell className="size-4" aria-hidden />
            <p className="text-[11px] uppercase tracking-[0.18em]">Assigned plan</p>
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {plan.title}
          </h2>
          {plan.coachNote && (
            <p className="mt-1 text-sm text-muted-foreground">{plan.coachNote}</p>
          )}
          <ul className="mt-4 space-y-3">
            {plan.sessions.map((session) => (
              <li
                key={session.id}
                className="rounded-xl border border-border/50 bg-card/40 px-3 py-3"
              >
                <p className="text-sm font-medium">
                  {session.dayLabel} · {session.title}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {session.exercises.map((exercise) => (
                    <li key={exercise.id}>
                      {exercise.name || "Exercise"} — {exercise.prescription}
                      {exercise.notes ? ` (${exercise.notes})` : ""}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
