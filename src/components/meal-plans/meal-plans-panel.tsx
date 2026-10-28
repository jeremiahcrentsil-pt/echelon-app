"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  StickyNote,
  UtensilsCrossed,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api/http";
import {
  dayTotals,
  eatenCountForDay,
  formatAssignedAt,
  getCompletion,
  planDayIndexForDate,
  SLOT_LABELS,
  todayKey,
  upsertCompletion,
  type MealCompletion,
  type MealPlan,
  type MealPlanStore,
  type PlannedMeal,
} from "@/lib/data/meal-plans";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error" | "empty";

async function fetchMealPlans() {
  return apiJson<{ plans: MealPlan[]; completions: MealCompletion[] }>(
    "/api/meal-plans",
  );
}

export function MealPlansPanel() {
  const [store, setStore] = useState<MealPlanStore>({ plans: [], completions: [] });
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(planDayIndexForDate());
  const [noteMealId, setNoteMealId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const dateKey = todayKey();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchMealPlans();
        if (cancelled) return;
        setStore(data);
        setSelectedPlanId(data.plans[0]?.id ?? null);
        setStatus(data.plans.length === 0 ? "empty" : "ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load meal plans",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myPlans = store.plans;

  const plan = useMemo(
    () => myPlans.find((item) => item.id === selectedPlanId) ?? myPlans[0] ?? null,
    [myPlans, selectedPlanId],
  );

  const day = useMemo(
    () => plan?.days.find((item) => item.dayIndex === selectedDayIndex) ?? plan?.days[0] ?? null,
    [plan, selectedDayIndex],
  );

  const totals = useMemo(() => (day ? dayTotals(day) : null), [day]);

  async function persistCompletion(nextCompletion: MealCompletion) {
    const { completion } = await apiJson<{ completion: MealCompletion }>(
      "/api/meal-plans",
      {
        method: "PATCH",
        body: JSON.stringify({
          action: "completion",
          completion: nextCompletion,
        }),
      },
    );
    setStore((current) => ({
      ...current,
      completions: upsertCompletion(current.completions, completion),
    }));
    setStatus("ready");
  }

  function toggleEaten(meal: PlannedMeal) {
    if (!plan) return;
    startTransition(async () => {
      const existing = getCompletion(store.completions, meal.id, dateKey);
      const nextCompletion: MealCompletion = {
        mealId: meal.id,
        dateKey,
        eaten: !existing?.eaten,
        adherenceNote: existing?.adherenceNote,
        updatedAt: new Date().toISOString(),
      };
      try {
        await persistCompletion(nextCompletion);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to update meal",
        );
      }
    });
  }

  function saveNote(meal: PlannedMeal) {
    startTransition(async () => {
      const existing = getCompletion(store.completions, meal.id, dateKey);
      const nextCompletion: MealCompletion = {
        mealId: meal.id,
        dateKey,
        eaten: existing?.eaten ?? false,
        adherenceNote: noteDraft.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      try {
        await persistCompletion(nextCompletion);
        setNoteMealId(null);
        setNoteDraft("");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to save note",
        );
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading assigned meal plans…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-6 animate-rise">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" aria-hidden />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load meal plans
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button
          className="mt-4"
          onClick={() => {
            setStatus("loading");
            setErrorMessage(null);
            void (async () => {
              try {
                const data = await fetchMealPlans();
                setStore(data);
                setSelectedPlanId(data.plans[0]?.id ?? null);
                setStatus(data.plans.length === 0 ? "empty" : "ready");
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to load meal plans",
                );
                setStatus("error");
              }
            })();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (status === "empty" || !plan || !day) {
    return (
      <div className="mx-auto max-w-2xl animate-rise">
        <Header />
        <div className="mt-8 rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
          <UtensilsCrossed className="mx-auto size-8 text-primary" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            No plans assigned
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            When Jeremiah assigns a meal plan to your account, it will show up here.
          </p>
        </div>
      </div>
    );
  }

  const eatenToday = eatenCountForDay(day, store.completions, dateKey);

  return (
    <div className="mx-auto max-w-3xl">
      <Header />

      {myPlans.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2 animate-rise">
          {myPlans.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedPlanId(item.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                item.id === plan.id
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-sm sm:p-6 animate-rise stagger-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
              Assigned plan
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
              {plan.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {plan.coachNote}
            </p>
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">
            Since {formatAssignedAt(plan.assignedAt)}
          </p>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Daily calories" value={`${plan.calorieTarget}`} unit="kcal" />
          <Stat label="Protein target" value={`${plan.proteinTargetG}`} unit="g" />
          <Stat
            label="Today’s meals"
            value={`${eatenToday}/${day.meals.length}`}
            unit="eaten"
          />
        </dl>
      </section>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 animate-rise stagger-2">
        {plan.days.map((planDay) => {
          const isToday = planDay.dayIndex === planDayIndexForDate();
          const count = eatenCountForDay(planDay, store.completions, dateKey);
          return (
            <button
              key={planDay.dayIndex}
              type="button"
              onClick={() => setSelectedDayIndex(planDay.dayIndex)}
              className={cn(
                "min-w-[4.5rem] rounded-xl border px-3 py-2 text-left transition-colors",
                selectedDayIndex === planDay.dayIndex
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="block text-xs font-medium">
                {planDay.label.slice(0, 3)}
                {isToday ? " ·" : ""}
              </span>
              <span className="mt-0.5 block text-[11px] opacity-80">
                {count}/{planDay.meals.length}
              </span>
            </button>
          );
        })}
      </div>

      <section className="mb-4 animate-rise stagger-3">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight">
              {day.label}
            </h3>
            {day.focus && (
              <p className="text-sm text-muted-foreground">{day.focus}</p>
            )}
          </div>
          {totals && (
            <p className="text-xs text-muted-foreground">
              {totals.calories} kcal · P {totals.proteinG}g · C {totals.carbsG}g · F{" "}
              {totals.fatG}g
            </p>
          )}
        </div>

        <ul className="space-y-3">
          {day.meals.map((meal) => {
            const completion = getCompletion(
              store.completions,
              meal.id,
              dateKey,
            );
            const eaten = Boolean(completion?.eaten);
            const noting = noteMealId === meal.id;

            return (
              <li
                key={meal.id}
                className={cn(
                  "rounded-2xl border bg-card/55 p-4 backdrop-blur-sm transition-colors",
                  eaten ? "border-primary/35" : "border-border/60",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {SLOT_LABELS[meal.slot]}
                    </p>
                    <h4 className="mt-1 font-display text-lg font-semibold tracking-tight">
                      {meal.name}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {meal.description}
                    </p>
                    <p className="mt-2 text-sm text-foreground/85">
                      {meal.calories} kcal · P {meal.proteinG}g · C {meal.carbsG}g ·
                      F {meal.fatG}g
                    </p>
                    {meal.notes && (
                      <p className="mt-2 text-xs italic text-muted-foreground">
                        Coach: {meal.notes}
                      </p>
                    )}
                    {completion?.adherenceNote && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-primary">
                        <StickyNote className="mt-0.5 size-3.5 shrink-0" />
                        {completion.adherenceNote}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={eaten ? "default" : "outline"}
                      disabled={isPending}
                      onClick={() => toggleEaten(meal)}
                    >
                      {eaten ? (
                        <>
                          <Check className="size-3.5" />
                          Eaten
                        </>
                      ) : (
                        "Mark eaten"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setNoteMealId(noting ? null : meal.id);
                        setNoteDraft(completion?.adherenceNote ?? "");
                      }}
                    >
                      Note
                    </Button>
                  </div>
                </div>

                {noting && (
                  <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                    <Label htmlFor={`note-${meal.id}`}>Adherence note</Label>
                    <Input
                      id={`note-${meal.id}`}
                      placeholder="Swapped rice for potato, ate out, etc."
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => saveNote(meal)}
                      >
                        Save note
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setNoteMealId(null);
                          setNoteDraft("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Header() {
  return (
    <header className="mb-8 animate-rise">
      <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">
        Assigned by coach
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Meal plans
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Follow the weekly plan Jeremiah assigned — check off meals as you go and
        leave a quick note when you deviate.
      </p>
    </header>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-display text-lg font-semibold">
        {value}
        <span className="ml-1 text-xs font-sans font-normal text-muted-foreground">
          {unit}
        </span>
      </dd>
    </div>
  );
}
