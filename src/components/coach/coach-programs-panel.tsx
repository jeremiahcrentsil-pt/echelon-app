"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api/http";
import { fetchClients, type MockClient } from "@/lib/data/clients";
import {
  createId,
  emptyProgramDay,
  emptyProgramExercise,
  emptyProgramWeek,
  emptyWorkoutPlanDraft,
  flattenProgramDays,
  formatExercisePrescription,
  type ProgramDay,
  type ProgramExercise,
  type ProgramWeek,
  type WorkoutPlan,
} from "@/lib/data/workout-plans";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error";

export function CoachProgramsPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clients, setClients] = useState<MockClient[]>([]);
  const [programs, setPrograms] = useState<WorkoutPlan[]>([]);
  const [draft, setDraft] = useState(emptyWorkoutPlanDraft);
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [roster, workouts] = await Promise.all([
          fetchClients(),
          apiJson<{ plans: WorkoutPlan[] }>("/api/workout-plans?scope=all"),
        ]);
        if (cancelled) return;
        setClients(roster);
        setPrograms(workouts.plans);
        if (roster[0]) {
          setDraft((current) => ({
            ...current,
            assignedClientIds: [roster[0].id],
          }));
        }
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load programs",
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

  function toggleClient(id: string) {
    setDraft((current) => ({
      ...current,
      assignedClientIds: current.assignedClientIds.includes(id)
        ? current.assignedClientIds.filter((item) => item !== id)
        : [...current.assignedClientIds, id],
    }));
  }

  function updateWeek(
    weekIndex: number,
    updater: (week: ProgramWeek) => ProgramWeek,
  ) {
    setDraft((current) => ({
      ...current,
      weeks: current.weeks.map((week, index) =>
        index === weekIndex ? updater(week) : week,
      ),
    }));
  }

  function updateDay(
    weekIndex: number,
    dayIndex: number,
    updater: (day: ProgramDay) => ProgramDay,
  ) {
    updateWeek(weekIndex, (week) => ({
      ...week,
      days: week.days.map((day, index) =>
        index === dayIndex ? updater(day) : day,
      ),
    }));
  }

  function updateExercise(
    weekIndex: number,
    dayIndex: number,
    exerciseIndex: number,
    patch: Partial<ProgramExercise>,
  ) {
    updateDay(weekIndex, dayIndex, (day) => ({
      ...day,
      exercises: day.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, ...patch } : exercise,
      ),
    }));
  }

  function createProgram() {
    startTransition(async () => {
      if (!draft.title.trim()) {
        setFlash("Add a program title.");
        return;
      }
      if (draft.assignedClientIds.length === 0) {
        setFlash("Pick at least one client to assign.");
        return;
      }
      const weeks = draft.weeks
        .map((week, weekIndex) => ({
          ...week,
          weekNumber: weekIndex + 1,
          label: week.label.trim() || `Week ${weekIndex + 1}`,
          days: week.days
            .map((day) => ({
              ...day,
              title: day.title.trim() || day.dayLabel,
              exercises: day.exercises.filter((ex) => ex.name.trim()),
            }))
            .filter((day) => day.exercises.length > 0),
        }))
        .filter((week) => week.days.length > 0);

      if (weeks.length === 0) {
        setFlash("Add at least one day with named exercises.");
        return;
      }

      const plan: WorkoutPlan = {
        id: createId("wp"),
        title: draft.title.trim(),
        coachNote: draft.coachNote.trim(),
        assignedClientIds: draft.assignedClientIds,
        assignedAt: new Date().toISOString(),
        weeks,
      };

      try {
        const { plan: created } = await apiJson<{ plan: WorkoutPlan }>(
          "/api/workout-plans",
          {
            method: "POST",
            body: JSON.stringify({ plan }),
          },
        );
        setPrograms((current) => [created, ...current]);
        setDraft({
          ...emptyWorkoutPlanDraft(),
          assignedClientIds: clients[0] ? [clients[0].id] : [],
        });
        setFlash(`Created program “${created.title}”.`);
      } catch (error) {
        setFlash(
          error instanceof Error ? error.message : "Failed to create program",
        );
      }
    });
  }

  function assignProgram(plan: WorkoutPlan, clientId: string) {
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
        setPrograms((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setFlash(`Assigned “${plan.title}” to ${clientName(clientId)}.`);
      } catch (error) {
        setFlash(
          error instanceof Error ? error.message : "Failed to assign program",
        );
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm">Loading programs…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load programs
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-signal">
          Programming
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Workout programs
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Build multi-week blocks — weeks, training days, and exercises with
          sets, reps, and cues. Assign to clients; they log against the current
          day.
        </p>
      </header>

      {flash && (
        <p className="flex items-center gap-2 text-sm text-primary animate-fade">
          <Check className="size-4" />
          {flash}
        </p>
      )}

      <section className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-6 animate-rise stagger-1">
        <h2 className="font-display text-xl font-semibold">New program</h2>
        <div className="mt-4 grid gap-4">
          <Field
            id="prog-title"
            label="Program title"
            value={draft.title}
            onChange={(value) =>
              setDraft((current) => ({ ...current, title: value }))
            }
            placeholder="Hypertrophy block · 4 weeks"
          />
          <div className="space-y-2">
            <Label htmlFor="prog-note">Coach note</Label>
            <Textarea
              id="prog-note"
              value={draft.coachNote}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  coachNote: event.target.value,
                }))
              }
              placeholder="Warm up thoroughly. Log working sets honestly."
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {draft.weeks.map((week, weekIndex) => (
            <div
              key={week.id}
              className="rounded-xl border border-border/50 bg-secondary/20 p-3 sm:p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Field
                  id={`wk-label-${week.id}`}
                  label="Week label"
                  value={week.label}
                  onChange={(value) =>
                    updateWeek(weekIndex, (current) => ({
                      ...current,
                      label: value,
                    }))
                  }
                />
                <div className="flex gap-1 self-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={weekIndex === 0}
                    aria-label="Move week up"
                    onClick={() =>
                      setDraft((current) => {
                        const weeks = [...current.weeks];
                        const tmp = weeks[weekIndex - 1];
                        weeks[weekIndex - 1] = weeks[weekIndex];
                        weeks[weekIndex] = tmp;
                        return {
                          ...current,
                          weeks: weeks.map((item, index) => ({
                            ...item,
                            weekNumber: index + 1,
                            label: item.label.replace(
                              /Week \d+/,
                              `Week ${index + 1}`,
                            ),
                          })),
                        };
                      })
                    }
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={weekIndex === draft.weeks.length - 1}
                    aria-label="Move week down"
                    onClick={() =>
                      setDraft((current) => {
                        const weeks = [...current.weeks];
                        const tmp = weeks[weekIndex + 1];
                        weeks[weekIndex + 1] = weeks[weekIndex];
                        weeks[weekIndex] = tmp;
                        return {
                          ...current,
                          weeks: weeks.map((item, index) => ({
                            ...item,
                            weekNumber: index + 1,
                          })),
                        };
                      })
                    }
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  {draft.weeks.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove week"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          weeks: current.weeks
                            .filter((_, index) => index !== weekIndex)
                            .map((item, index) => ({
                              ...item,
                              weekNumber: index + 1,
                              label: `Week ${index + 1}`,
                            })),
                        }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {week.days.map((day, dayIndex) => (
                  <div
                    key={day.id}
                    className="rounded-lg border border-border/40 bg-card/50 p-3"
                  >
                    <div className="mb-3 grid gap-2 sm:grid-cols-2">
                      <Field
                        id={`day-label-${day.id}`}
                        label="Day label"
                        value={day.dayLabel}
                        onChange={(value) =>
                          updateDay(weekIndex, dayIndex, (current) => ({
                            ...current,
                            dayLabel: value,
                          }))
                        }
                      />
                      <Field
                        id={`day-title-${day.id}`}
                        label="Session title"
                        value={day.title}
                        onChange={(value) =>
                          updateDay(weekIndex, dayIndex, (current) => ({
                            ...current,
                            title: value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      {day.exercises.map((exercise, exerciseIndex) => (
                        <div
                          key={exercise.id}
                          className="grid gap-2 rounded-md border border-border/30 bg-secondary/15 p-2 sm:grid-cols-[1.4fr_4.5rem_5.5rem_1fr_auto]"
                        >
                          <Input
                            placeholder="Exercise"
                            value={exercise.name}
                            onChange={(event) =>
                              updateExercise(
                                weekIndex,
                                dayIndex,
                                exerciseIndex,
                                { name: event.target.value },
                              )
                            }
                          />
                          <Input
                            inputMode="numeric"
                            placeholder="Sets"
                            aria-label="Target sets"
                            value={String(exercise.targetSets)}
                            onChange={(event) =>
                              updateExercise(
                                weekIndex,
                                dayIndex,
                                exerciseIndex,
                                {
                                  targetSets:
                                    Number.parseInt(event.target.value, 10) ||
                                    0,
                                },
                              )
                            }
                          />
                          <Input
                            placeholder="Reps"
                            aria-label="Target reps"
                            value={exercise.targetReps}
                            onChange={(event) =>
                              updateExercise(
                                weekIndex,
                                dayIndex,
                                exerciseIndex,
                                { targetReps: event.target.value },
                              )
                            }
                          />
                          <Input
                            placeholder="Notes / cue"
                            value={exercise.notes ?? ""}
                            onChange={(event) =>
                              updateExercise(
                                weekIndex,
                                dayIndex,
                                exerciseIndex,
                                {
                                  notes: event.target.value || undefined,
                                },
                              )
                            }
                          />
                          {day.exercises.length > 1 ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground"
                              aria-label="Remove exercise"
                              onClick={() =>
                                updateDay(weekIndex, dayIndex, (current) => ({
                                  ...current,
                                  exercises: current.exercises.filter(
                                    (_, index) => index !== exerciseIndex,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : (
                            <span className="size-8" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateDay(weekIndex, dayIndex, (current) => ({
                            ...current,
                            exercises: [
                              ...current.exercises,
                              emptyProgramExercise(),
                            ],
                          }))
                        }
                      >
                        <Plus className="size-3.5" />
                        Exercise
                      </Button>
                      {week.days.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            updateWeek(weekIndex, (current) => ({
                              ...current,
                              days: current.days.filter(
                                (_, index) => index !== dayIndex,
                              ),
                            }))
                          }
                        >
                          Remove day
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() =>
                  updateWeek(weekIndex, (current) => ({
                    ...current,
                    days: [
                      ...current.days,
                      emptyProgramDay(current.days.length + 1),
                    ],
                  }))
                }
              >
                <Plus className="size-3.5" />
                Add day
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                weeks: [
                  ...current.weeks,
                  emptyProgramWeek(current.weeks.length + 1),
                ],
              }))
            }
          >
            <Plus className="size-4" />
            Add week
          </Button>
        </div>

        <ClientChips
          clients={clients}
          selected={draft.assignedClientIds}
          onToggle={toggleClient}
        />

        <Button className="mt-4" onClick={createProgram} disabled={isPending}>
          <Plus className="size-4" />
          Create & assign program
        </Button>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-6 animate-rise stagger-2">
        <h2 className="font-display text-xl font-semibold">
          Assigned programs
        </h2>
        {programs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No programs yet — create one above.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {programs.map((plan) => {
              const dayCount = flattenProgramDays(plan).length;
              return (
                <li
                  key={plan.id}
                  className="rounded-xl border border-border/50 bg-secondary/20 p-3"
                >
                  <p className="font-medium">{plan.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.weeks.length} week
                    {plan.weeks.length === 1 ? "" : "s"} · {dayCount} day
                    {dayCount === 1 ? "" : "s"} · assigned to{" "}
                    {plan.assignedClientIds.map(clientName).join(", ") ||
                      "nobody"}
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                    {plan.weeks.map((week) => (
                      <li key={week.id}>
                        <span className="font-medium text-foreground/80">
                          {week.label}
                        </span>
                        {": "}
                        {week.days
                          .map(
                            (day) =>
                              `${day.dayLabel} (${day.exercises
                                .map(formatExercisePrescription)
                                .join(", ")})`,
                          )
                          .join(" · ")}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {clients.map((client) => (
                      <Button
                        key={client.id}
                        size="sm"
                        variant="outline"
                        disabled={
                          isPending ||
                          plan.assignedClientIds.includes(client.id)
                        }
                        onClick={() => assignProgram(plan, client.id)}
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-[10rem] flex-1 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
