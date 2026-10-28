"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  ImageIcon,
  Loader2,
  Play,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiJson } from "@/lib/api/http";
import {
  EXERCISE_LIBRARY,
  filterExercises,
  getExerciseById,
  MUSCLE_FILTERS,
  type Exercise,
  type MuscleGroup,
} from "@/lib/data/exercises";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error";

async function fetchFavoriteIds() {
  const data = await apiJson<{ favoriteIds: string[] }>(
    "/api/exercises/favorites",
  );
  return data.favoriteIds;
}

export function ExerciseLibrary() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "All">("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    EXERCISE_LIBRARY[0]?.id ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ids = await fetchFavoriteIds();
        if (cancelled) return;
        setFavoriteIds(ids);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load favorites",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterExercises(query, muscle, favoritesOnly, favoriteIds),
    [query, muscle, favoritesOnly, favoriteIds],
  );

  const selected =
    (selectedId ? getExerciseById(selectedId) : null) ??
    filtered[0] ??
    null;

  function toggleFavorite(id: string) {
    const previous = favoriteIds;
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter((item) => item !== id)
      : [...favoriteIds, id];
    setFavoriteIds(next);
    void (async () => {
      try {
        const data = await apiJson<{ favoriteIds: string[] }>(
          "/api/exercises/favorites",
          {
            method: "PUT",
            body: JSON.stringify({ favoriteIds: next }),
          },
        );
        setFavoriteIds(data.favoriteIds);
      } catch (error) {
        setFavoriteIds(previous);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to update favorites",
        );
      }
    })();
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading exercise library…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-6 animate-rise">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load exercises
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button
          className="mt-4"
          onClick={() => {
            setStatus("loading");
            void (async () => {
              try {
                setFavoriteIds(await fetchFavoriteIds());
                setStatus("ready");
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to load favorites",
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

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">
          Movement library
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Exercises
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Browse cues, muscle groups, and demo placeholders for the lifts in your
          program. Star the ones you revisit often.
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 animate-rise stagger-1">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, equipment, or muscle…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search exercises"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMuscle(item)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                muscle === item
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFavoritesOnly((value) => !value)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs transition-colors",
              favoritesOnly
                ? "border-signal/50 bg-signal/15 text-signal"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Favorites
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="animate-rise stagger-2">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center">
              <h2 className="font-display text-lg font-semibold">No matches</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another search or clear the favorites filter.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((exercise) => {
                const active = selected?.id === exercise.id;
                const fav = favoriteIds.includes(exercise.id);
                return (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(exercise.id)}
                      className={cn(
                        "flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                        active
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/60 bg-card/50 hover:border-primary/25",
                      )}
                    >
                      <div>
                        <p className="font-medium">{exercise.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {exercise.muscleGroups.join(" · ")} · {exercise.equipment}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "mt-0.5",
                          fav ? "text-signal" : "text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {fav ? (
                          <BookmarkCheck className="size-4" />
                        ) : (
                          <Bookmark className="size-4 opacity-50" />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="animate-rise stagger-3">
          {selected ? (
            <ExerciseDetail
              exercise={selected}
              favorited={favoriteIds.includes(selected.id)}
              onToggleFavorite={() => toggleFavorite(selected.id)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
              Select an exercise to see cues and demo.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ExerciseDetail({
  exercise,
  favorited,
  onToggleFavorite,
}: {
  exercise: Exercise;
  favorited: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {exercise.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {exercise.difficulty} · {exercise.equipment}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {exercise.muscleGroups.map((group) => (
              <span
                key={group}
                className="rounded-md border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {group}
              </span>
            ))}
          </div>
        </div>
        <Button
          variant={favorited ? "default" : "outline"}
          size="sm"
          onClick={onToggleFavorite}
        >
          {favorited ? (
            <>
              <BookmarkCheck className="size-3.5" />
              Favorited
            </>
          ) : (
            <>
              <Bookmark className="size-3.5" />
              Favorite
            </>
          )}
        </Button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border/60 bg-secondary/40">
        <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_center,oklch(0.35_0.06_195/35%),transparent_65%)]">
          {exercise.demoKind === "video" ? (
            <Play className="size-10 text-primary" aria-hidden />
          ) : (
            <ImageIcon className="size-10 text-primary" aria-hidden />
          )}
          <p className="text-sm font-medium">{exercise.demoLabel}</p>
          <p className="text-xs text-muted-foreground">
            Demo placeholder · coach media coming later
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="font-display text-sm font-semibold tracking-wide uppercase">
          Cues
        </h3>
        <ul className="mt-2 space-y-2 text-sm text-foreground/90">
          {exercise.cues.map((cue) => (
            <li key={cue} className="border-l-2 border-primary/40 pl-3">
              {cue}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <h3 className="font-display text-sm font-semibold tracking-wide uppercase">
          Watch for
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {exercise.commonMistakes.map((item) => (
            <li
              key={item}
              className="rounded-lg bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
