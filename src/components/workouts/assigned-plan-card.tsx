"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Dumbbell, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/api/http";
import {
  flattenProgramDays,
  formatExercisePrescription,
  getAssignedDay,
  type ProgramDay,
  type WorkoutPlan,
} from "@/lib/data/workout-plans";

type Props = {
  onLogDay?: (plan: WorkoutPlan, day: ProgramDay) => void;
};

export function AssignedPlanCard({ onLogDay }: Props) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiJson<{ plans: WorkoutPlan[] }>("/api/workout-plans");
        if (cancelled) return;
        setPlans(data.plans);
      } catch {
        if (!cancelled) setPlans([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (plans.length === 0) return null;

  return (
    <section className="mb-8 space-y-3 animate-rise">
      {plans.map((plan) => {
        const assigned = getAssignedDay(plan, plan.progress);
        const completed = new Set(plan.progress?.completedDayIds ?? []);
        const totalDays = flattenProgramDays(plan).length;
        const doneCount = completed.size;

        return (
          <div
            key={plan.id}
            className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5"
          >
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Dumbbell className="size-4" aria-hidden />
              <p className="text-[11px] uppercase tracking-[0.18em]">
                Assigned program
              </p>
            </div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {plan.title}
            </h2>
            {plan.coachNote && (
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.coachNote}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {doneCount} of {totalDays} days logged
            </p>

            {assigned && (
              <div className="mt-4 rounded-xl border border-primary/30 bg-card/60 px-3 py-3 sm:px-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-signal">
                      Up next · {assigned.week.label}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold">
                      {assigned.day.dayLabel} · {assigned.day.title}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {assigned.day.exercises.map((exercise) => (
                        <li key={exercise.id}>
                          {exercise.name} —{" "}
                          {formatExercisePrescription(exercise)}
                          {exercise.notes ? ` (${exercise.notes})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {onLogDay && (
                    <Button
                      className="shrink-0"
                      onClick={() => onLogDay(plan, assigned.day)}
                    >
                      <Play className="size-4" />
                      Log this session
                    </Button>
                  )}
                </div>
              </div>
            )}

            <ul className="mt-4 space-y-3">
              {plan.weeks.map((week) => (
                <li key={week.id}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {week.label}
                  </p>
                  <ul className="space-y-2">
                    {week.days.map((day) => {
                      const isDone = completed.has(day.id);
                      const isCurrent = assigned?.day.id === day.id;
                      return (
                        <li
                          key={day.id}
                          className={`rounded-xl border px-3 py-3 ${
                            isCurrent
                              ? "border-primary/40 bg-primary/10"
                              : "border-border/50 bg-card/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {day.dayLabel} · {day.title}
                            </p>
                            {isDone && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                                <CheckCircle2 className="size-3.5" />
                                Logged
                              </span>
                            )}
                          </div>
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {day.exercises.map((exercise) => (
                              <li key={exercise.id}>
                                {exercise.name || "Exercise"} —{" "}
                                {formatExercisePrescription(exercise)}
                                {exercise.notes ? ` (${exercise.notes})` : ""}
                              </li>
                            ))}
                          </ul>
                          {onLogDay && !isDone && (
                            <Button
                              size="sm"
                              variant={isCurrent ? "default" : "outline"}
                              className="mt-3"
                              onClick={() => onLogDay(plan, day)}
                            >
                              <Play className="size-3.5" />
                              Log day
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
