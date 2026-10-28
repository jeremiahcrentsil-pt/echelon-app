"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createId,
  draftToWorkout,
  emptyDraft,
  formatWorkoutDate,
  loadWorkouts,
  saveWorkouts,
  workoutSummary,
  type Workout,
  type WorkoutDraft,
} from "@/lib/data/workouts";

type Status = "loading" | "ready" | "error" | "empty";

export function WorkoutLogger() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkoutDraft>(emptyDraft);
  const [composerOpen, setComposerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      try {
        const data = loadWorkouts();
        if (cancelled) return;
        setWorkouts(data);
        setStatus(data.length === 0 ? "empty" : "ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load workouts",
        );
        setStatus("error");
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  function persist(next: Workout[]) {
    saveWorkouts(next);
    setWorkouts(next);
    setStatus(next.length === 0 ? "empty" : "ready");
  }

  function updateExercise(
    exerciseId: string,
    patch: Partial<WorkoutDraft["exercises"][number]>,
  ) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
      ),
    }));
  }

  function updateSet(
    exerciseId: string,
    setId: string,
    patch: Partial<WorkoutDraft["exercises"][number]["sets"][number]>,
  ) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set) =>
            set.id === setId ? { ...set, ...patch } : set,
          ),
        };
      }),
    }));
  }

  function handleSave() {
    startTransition(() => {
      const workout = draftToWorkout(draft);
      if (workout.exercises.length === 0) {
        setErrorMessage("Add at least one exercise with reps before saving.");
        return;
      }
      setErrorMessage(null);
      persist([workout, ...workouts]);
      setDraft(emptyDraft());
      setComposerOpen(false);
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading your sessions…</p>
      </div>
    );
  }

  if (status === "error" && workouts.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-6 animate-rise">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" aria-hidden />
          <h2 className="font-display text-lg font-semibold">Couldn’t load workouts</h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button
          className="mt-4"
          onClick={() => {
            setStatus("loading");
            setErrorMessage(null);
            try {
              const data = loadWorkouts();
              setWorkouts(data);
              setStatus(data.length === 0 ? "empty" : "ready");
            } catch (error) {
              setErrorMessage(
                error instanceof Error ? error.message : "Failed to load workouts",
              );
              setStatus("error");
            }
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">
            Training log
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Workouts
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Capture the session while it’s fresh — exercises, sets, reps, and notes
            your coach can review.
          </p>
        </div>
        <Button
          size="lg"
          className="shrink-0"
          onClick={() => {
            setComposerOpen((open) => !open);
            setErrorMessage(null);
          }}
        >
          <Plus className="size-4" />
          {composerOpen ? "Close logger" : "Log workout"}
        </Button>
      </header>

      {composerOpen && (
        <section className="mb-8 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[0_0_0_1px_oklch(0.78_0.12_175/8%)] backdrop-blur-sm sm:p-6 animate-rise">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            New session
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="workout-title">Session title</Label>
              <Input
                id="workout-title"
                placeholder="e.g. Lower strength A"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workout-duration">Duration (minutes)</Label>
              <Input
                id="workout-duration"
                inputMode="numeric"
                placeholder="55"
                value={draft.durationMinutes}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    durationMinutes: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="workout-notes">Session notes</Label>
              <Textarea
                id="workout-notes"
                placeholder="How did it feel? Any form cues?"
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {draft.exercises.map((exercise, exerciseIndex) => (
              <div
                key={exercise.id}
                className="rounded-xl border border-border/60 bg-secondary/30 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`ex-name-${exercise.id}`}>
                      Exercise {exerciseIndex + 1}
                    </Label>
                    <Input
                      id={`ex-name-${exercise.id}`}
                      placeholder="Exercise name"
                      value={exercise.name}
                      onChange={(event) =>
                        updateExercise(exercise.id, { name: event.target.value })
                      }
                    />
                  </div>
                  {draft.exercises.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-7 text-muted-foreground hover:text-destructive"
                      aria-label="Remove exercise"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          exercises: current.exercises.filter(
                            (item) => item.id !== exercise.id,
                          ),
                        }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {exercise.sets.map((set, setIndex) => (
                    <div
                      key={set.id}
                      className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2"
                    >
                      <span className="pb-2 text-xs text-muted-foreground">
                        Set {setIndex + 1}
                      </span>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`reps-${set.id}`}
                          className="text-[11px] text-muted-foreground"
                        >
                          Reps
                        </Label>
                        <Input
                          id={`reps-${set.id}`}
                          inputMode="numeric"
                          value={set.reps}
                          onChange={(event) =>
                            updateSet(exercise.id, set.id, {
                              reps: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`weight-${set.id}`}
                          className="text-[11px] text-muted-foreground"
                        >
                          Weight (lb)
                        </Label>
                        <Input
                          id={`weight-${set.id}`}
                          inputMode="decimal"
                          value={set.weightLbs}
                          onChange={(event) =>
                            updateSet(exercise.id, set.id, {
                              weightLbs: event.target.value,
                            })
                          }
                        />
                      </div>
                      {exercise.sets.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          aria-label="Remove set"
                          onClick={() =>
                            updateExercise(exercise.id, {
                              sets: exercise.sets.filter((item) => item.id !== set.id),
                            })
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

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateExercise(exercise.id, {
                        sets: [
                          ...exercise.sets,
                          { id: createId("set"), reps: "", weightLbs: "" },
                        ],
                      })
                    }
                  >
                    Add set
                  </Button>
                </div>

                <div className="mt-3 space-y-1">
                  <Label
                    htmlFor={`ex-notes-${exercise.id}`}
                    className="text-[11px] text-muted-foreground"
                  >
                    Exercise notes
                  </Label>
                  <Input
                    id={`ex-notes-${exercise.id}`}
                    placeholder="Optional cue or note"
                    value={exercise.notes}
                    onChange={(event) =>
                      updateExercise(exercise.id, { notes: event.target.value })
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  exercises: [
                    ...current.exercises,
                    {
                      id: createId("ex"),
                      name: "",
                      notes: "",
                      sets: [{ id: createId("set"), reps: "", weightLbs: "" }],
                    },
                  ],
                }))
              }
            >
              <Plus className="size-4" />
              Add exercise
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : "Save workout"}
            </Button>
          </div>

          {errorMessage && (
            <p className="mt-3 flex items-center gap-2 text-sm text-destructive" role="alert">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {errorMessage}
            </p>
          )}
        </section>
      )}

      {status === "empty" ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center animate-rise stagger-1">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            No sessions yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Log your first workout to start a training history your coach can follow.
          </p>
          {!composerOpen && (
            <Button className="mt-6" onClick={() => setComposerOpen(true)}>
              <Plus className="size-4" />
              Log workout
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {workouts.map((workout, index) => (
            <li
              key={workout.id}
              className={`rounded-2xl border border-border/60 bg-card/55 p-4 backdrop-blur-sm transition-colors hover:border-primary/35 sm:p-5 animate-rise stagger-${Math.min(index + 1, 4)}`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  {workout.title}
                </h2>
                <time
                  dateTime={workout.performedAt}
                  className="text-xs text-muted-foreground"
                >
                  {formatWorkoutDate(workout.performedAt)}
                </time>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {workoutSummary(workout)}
                {workout.durationMinutes
                  ? ` · ${workout.durationMinutes} min`
                  : ""}
              </p>
              {workout.notes && (
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                  {workout.notes}
                </p>
              )}
              <ul className="mt-4 space-y-3 border-t border-border/50 pt-4">
                {workout.exercises.map((exercise) => (
                  <li key={exercise.id}>
                    <p className="text-sm font-medium text-foreground">
                      {exercise.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {exercise.sets
                        .map((set) =>
                          set.weightLbs
                            ? `${set.reps}×${set.weightLbs} lb`
                            : `${set.reps} reps`,
                        )
                        .join(" · ")}
                    </p>
                    {exercise.notes && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        {exercise.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
