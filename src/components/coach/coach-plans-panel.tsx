"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, Check, Dumbbell, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api/http";
import { fetchClients, type MockClient } from "@/lib/data/clients";
import {
  createCoachMealPlan,
  type MealCompletion,
  type MealPlan,
  type MealPlanStore,
} from "@/lib/data/meal-plans";
import {
  flattenProgramDays,
  type WorkoutPlan,
} from "@/lib/data/workout-plans";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error";

export function CoachPlansPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clients, setClients] = useState<MockClient[]>([]);
  const [mealStore, setMealStore] = useState<MealPlanStore>({
    plans: [],
    completions: [],
  });
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [mealTitle, setMealTitle] = useState("Recomp · Plan B");
  const [mealNote, setMealNote] = useState("Keep protein high; carbs around training.");
  const [mealCals, setMealCals] = useState("2400");
  const [mealProtein, setMealProtein] = useState("190");
  const [mealClients, setMealClients] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [roster, meals, workouts] = await Promise.all([
          fetchClients(),
          apiJson<{ plans: MealPlan[]; completions: MealCompletion[] }>(
            "/api/meal-plans?scope=all",
          ),
          apiJson<{ plans: WorkoutPlan[] }>("/api/workout-plans?scope=all"),
        ]);
        if (cancelled) return;
        setClients(roster);
        setMealStore({ plans: meals.plans, completions: meals.completions });
        setWorkoutPlans(workouts.plans);
        if (roster[0]) {
          setMealClients([roster[0].id]);
        }
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load plans",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function clientName(id: string) {
    return clients.find((client) => client.id === id)?.name ?? id;
  }

  function toggleMealClient(id: string) {
    setMealClients((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function assignExistingMeal(plan: MealPlan, clientId: string) {
    startTransition(async () => {
      const assignedClientIds = plan.assignedClientIds.includes(clientId)
        ? plan.assignedClientIds
        : [...plan.assignedClientIds, clientId];
      try {
        const { plan: updated } = await apiJson<{ plan: MealPlan }>(
          "/api/meal-plans",
          {
            method: "PATCH",
            body: JSON.stringify({
              action: "assign",
              planId: plan.id,
              assignedClientIds,
            }),
          },
        );
        setMealStore((current) => ({
          ...current,
          plans: current.plans.map((item) =>
            item.id === updated.id ? updated : item,
          ),
        }));
        setFlash(`Assigned “${plan.title}” to roster update.`);
      } catch (error) {
        setFlash(
          error instanceof Error ? error.message : "Failed to assign meal plan",
        );
      }
    });
  }

  function assignWorkoutProgram(plan: WorkoutPlan, clientId: string) {
    startTransition(async () => {
      const assignedClientIds = plan.assignedClientIds.includes(clientId)
        ? plan.assignedClientIds
        : [...plan.assignedClientIds, clientId];
      try {
        const { plan: updated } = await apiJson<{ plan: WorkoutPlan }>(
          "/api/workout-plans",
          {
            method: "PATCH",
            body: JSON.stringify({
              action: "assign",
              planId: plan.id,
              assignedClientIds,
            }),
          },
        );
        setWorkoutPlans((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setFlash(`Assigned “${plan.title}” to ${clientName(clientId)}.`);
      } catch (error) {
        setFlash(
          error instanceof Error
            ? error.message
            : "Failed to assign workout program",
        );
      }
    });
  }

  function createMealPlan() {
    startTransition(async () => {
      if (mealClients.length === 0) {
        setFlash("Pick at least one client for the meal plan.");
        return;
      }
      const plan = createCoachMealPlan({
        title: mealTitle,
        coachNote: mealNote,
        calorieTarget: Number.parseInt(mealCals, 10) || 2000,
        proteinTargetG: Number.parseInt(mealProtein, 10) || 150,
        assignedClientIds: mealClients,
      });
      try {
        const { plan: created } = await apiJson<{ plan: MealPlan }>(
          "/api/meal-plans",
          {
            method: "POST",
            body: JSON.stringify({ plan }),
          },
        );
        setMealStore((current) => ({
          ...current,
          plans: [created, ...current.plans],
        }));
        setFlash(`Created and assigned “${created.title}”.`);
      } catch (error) {
        setFlash(
          error instanceof Error ? error.message : "Failed to create meal plan",
        );
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm">Loading plans…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <h2 className="font-display text-lg font-semibold">Couldn’t load plans</h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-signal">
          Nutrition
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Meal plans
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Create or assign meal plans. Workout programming lives under{" "}
          <Link href="/coach/programs" className="text-primary underline-offset-2 hover:underline">
            Programs
          </Link>
          .
        </p>
      </header>

      {flash && (
        <p className="flex items-center gap-2 text-sm text-primary animate-fade">
          <Check className="size-4" />
          {flash}
        </p>
      )}

      <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 animate-rise stagger-1">
        <div className="flex items-start gap-3">
          <Dumbbell className="mt-0.5 size-5 text-primary" aria-hidden />
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold">
              Workout programs
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Build weeks → days → exercises with sets, reps, and notes on the
              dedicated programs page.
            </p>
            <Link
              href="/coach/programs"
              className="mt-3 inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/80"
            >
              Open program builder
            </Link>
            {workoutPlans.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-border/40 pt-3">
                {workoutPlans.map((plan) => {
                  const days = flattenProgramDays(plan).length;
                  return (
                    <li
                      key={plan.id}
                      className="rounded-lg border border-border/40 bg-card/40 p-3"
                    >
                      <p className="text-sm font-medium">{plan.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {plan.weeks.length} week
                        {plan.weeks.length === 1 ? "" : "s"} · {days} day
                        {days === 1 ? "" : "s"} ·{" "}
                        {plan.assignedClientIds.map(clientName).join(", ") ||
                          "unassigned"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {clients.map((client) => (
                          <Button
                            key={client.id}
                            size="sm"
                            variant="outline"
                            disabled={
                              isPending ||
                              plan.assignedClientIds.includes(client.id)
                            }
                            onClick={() =>
                              assignWorkoutProgram(plan, client.id)
                            }
                          >
                            Assign {client.name.split(" ")[0]}
                          </Button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-6 animate-rise stagger-2">
        <h2 className="font-display text-xl font-semibold">Existing meal plans</h2>
        <ul className="mt-4 space-y-3">
          {mealStore.plans.map((plan) => (
            <li
              key={plan.id}
              className="rounded-xl border border-border/50 bg-secondary/20 p-3"
            >
              <p className="font-medium">{plan.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.calorieTarget} kcal · {plan.proteinTargetG}g protein · assigned to{" "}
                {plan.assignedClientIds.map(clientName).join(", ") || "nobody"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {clients.map((client) => (
                  <Button
                    key={client.id}
                    size="sm"
                    variant="outline"
                    disabled={
                      isPending || plan.assignedClientIds.includes(client.id)
                    }
                    onClick={() => assignExistingMeal(plan, client.id)}
                  >
                    Assign {client.name.split(" ")[0]}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-6 animate-rise stagger-3">
        <h2 className="font-display text-xl font-semibold">New meal plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seeds a full weekly template you can refine later — assigns immediately.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            id="meal-title"
            label="Title"
            value={mealTitle}
            onChange={setMealTitle}
          />
          <Field
            id="meal-cals"
            label="Calorie target"
            value={mealCals}
            onChange={setMealCals}
            inputMode="numeric"
          />
          <Field
            id="meal-protein"
            label="Protein target (g)"
            value={mealProtein}
            onChange={setMealProtein}
            inputMode="numeric"
          />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="meal-note">Coach note</Label>
            <Textarea
              id="meal-note"
              value={mealNote}
              onChange={(event) => setMealNote(event.target.value)}
            />
          </div>
        </div>
        <ClientChips
          clients={clients}
          selected={mealClients}
          onToggle={toggleMealClient}
        />
        <Button className="mt-4" onClick={createMealPlan} disabled={isPending}>
          <Plus className="size-4" />
          Create & assign meal plan
        </Button>
      </section>
    </div>
  );
}

function ClientChips({
  clients,
  selected,
  onToggle,
}: {
  clients: MockClient[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      <Label>Assign to</Label>
      <div className="flex flex-wrap gap-2">
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            onClick={() => onToggle(client.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              selected.includes(client.id)
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {client.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
