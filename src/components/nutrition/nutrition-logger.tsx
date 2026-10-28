"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, Loader2, Plus, ScanBarcode, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api/http";
import {
  draftToEntry,
  emptyDraft,
  entriesForDate,
  formatDayLabel,
  formatMacro,
  MEAL_LABELS,
  MEAL_ORDER,
  sumMacros,
  todayKey,
  type FoodEntry,
  type FoodEntryDraft,
} from "@/lib/data/nutrition";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error" | "empty";

async function fetchEntries() {
  const data = await apiJson<{ entries: FoodEntry[] }>("/api/nutrition");
  return data.entries;
}

export function NutritionLogger() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [date] = useState(todayKey);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<FoodEntryDraft>(emptyDraft);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchEntries();
        if (cancelled) return;
        setEntries(data);
        const day = entriesForDate(data, date);
        setStatus(day.length === 0 ? "empty" : "ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load nutrition log",
        );
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  const dayEntries = useMemo(
    () => entriesForDate(entries, date),
    [entries, date],
  );
  const totals = useMemo(() => sumMacros(dayEntries), [dayEntries]);

  function applyEntries(next: FoodEntry[]) {
    setEntries(next);
    const day = entriesForDate(next, date);
    setStatus(day.length === 0 ? "empty" : "ready");
  }

  function handleSave() {
    startTransition(async () => {
      if (!draft.name.trim()) {
        setErrorMessage("Add a food name before saving.");
        return;
      }
      setErrorMessage(null);
      const entry = draftToEntry(draft, date);
      try {
        const { entry: created } = await apiJson<{ entry: FoodEntry }>(
          "/api/nutrition",
          {
            method: "POST",
            body: JSON.stringify({ entry }),
          },
        );
        applyEntries([created, ...entries]);
        setDraft(emptyDraft(draft.meal));
        setComposerOpen(false);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to save food entry",
        );
      }
    });
  }

  function removeEntry(id: string) {
    startTransition(async () => {
      try {
        await apiJson<{ ok: boolean }>(`/api/nutrition?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        applyEntries(entries.filter((entry) => entry.id !== id));
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to remove entry",
        );
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading today’s intake…</p>
      </div>
    );
  }

  if (status === "error" && dayEntries.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-6 animate-rise">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" aria-hidden />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load nutrition
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
                const data = await fetchEntries();
                setEntries(data);
                setStatus(
                  entriesForDate(data, date).length === 0 ? "empty" : "ready",
                );
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to load nutrition log",
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
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">
            Daily intake
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Nutrition
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Log meals and macros for {formatDayLabel(date).toLowerCase()}. Scan a
            barcode when the label is faster than typing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="lg" render={<Link href="/scan" />}>
            <ScanBarcode className="size-4" />
            Scan food
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setComposerOpen((open) => !open);
              setErrorMessage(null);
            }}
          >
            <Plus className="size-4" />
            {composerOpen ? "Close" : "Log food"}
          </Button>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 animate-rise stagger-1">
        <MacroStat label="Calories" value={formatMacro(totals.calories)} unit="kcal" />
        <MacroStat label="Protein" value={formatMacro(totals.proteinG)} unit="g" />
        <MacroStat label="Carbs" value={formatMacro(totals.carbsG)} unit="g" />
        <MacroStat label="Fat" value={formatMacro(totals.fatG)} unit="g" />
      </section>

      {composerOpen && (
        <section className="mb-8 rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-sm sm:p-6 animate-rise">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Add food
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {MEAL_ORDER.map((meal) => (
              <button
                key={meal}
                type="button"
                onClick={() => setDraft((current) => ({ ...current, meal }))}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  draft.meal === meal
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {MEAL_LABELS[meal]}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              id="food-name"
              label="Food"
              value={draft.name}
              placeholder="e.g. Chicken breast"
              onChange={(value) =>
                setDraft((current) => ({ ...current, name: value }))
              }
            />
            <Field
              id="food-brand"
              label="Brand (optional)"
              value={draft.brand}
              placeholder="Brand"
              onChange={(value) =>
                setDraft((current) => ({ ...current, brand: value }))
              }
            />
            <Field
              id="food-serving"
              label="Serving size"
              value={draft.servingLabel}
              placeholder="1 serving"
              onChange={(value) =>
                setDraft((current) => ({ ...current, servingLabel: value }))
              }
            />
            <Field
              id="food-servings"
              label="Servings"
              value={draft.servings}
              inputMode="decimal"
              placeholder="1"
              onChange={(value) =>
                setDraft((current) => ({ ...current, servings: value }))
              }
            />
            <Field
              id="food-cal"
              label="Calories / serving"
              value={draft.calories}
              inputMode="numeric"
              placeholder="0"
              onChange={(value) =>
                setDraft((current) => ({ ...current, calories: value }))
              }
            />
            <Field
              id="food-protein"
              label="Protein g / serving"
              value={draft.proteinG}
              inputMode="decimal"
              placeholder="0"
              onChange={(value) =>
                setDraft((current) => ({ ...current, proteinG: value }))
              }
            />
            <Field
              id="food-carbs"
              label="Carbs g / serving"
              value={draft.carbsG}
              inputMode="decimal"
              placeholder="0"
              onChange={(value) =>
                setDraft((current) => ({ ...current, carbsG: value }))
              }
            />
            <Field
              id="food-fat"
              label="Fat g / serving"
              value={draft.fatG}
              inputMode="decimal"
              placeholder="0"
              onChange={(value) =>
                setDraft((current) => ({ ...current, fatG: value }))
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : "Save to today’s log"}
            </Button>
          </div>
          {errorMessage && (
            <p
              className="mt-3 flex items-center gap-2 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {errorMessage}
            </p>
          )}
        </section>
      )}

      {dayEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center animate-rise stagger-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Nothing logged today
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Add a meal manually or scan a barcode to start today’s nutrition log.
          </p>
          {!composerOpen && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setComposerOpen(true)}>
                <Plus className="size-4" />
                Log food
              </Button>
              <Button variant="outline" render={<Link href="/scan" />}>
                <ScanBarcode className="size-4" />
                Scan
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {MEAL_ORDER.map((meal) => {
            const items = dayEntries.filter((entry) => entry.meal === meal);
            if (items.length === 0) return null;
            return (
              <section key={meal} className="animate-rise stagger-2">
                <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
                  {MEAL_LABELS[meal]}
                </h2>
                <ul className="space-y-2">
                  {items.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-card/55 p-4 backdrop-blur-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {entry.name}
                          {entry.brand ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {entry.brand}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.servings}× {entry.servingLabel}
                          {entry.barcode ? ` · ${entry.barcode}` : ""}
                          {entry.source === "barcode" ? " · scanned" : ""}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatMacro(entry.macros.calories)} kcal · P{" "}
                          {formatMacro(entry.macros.proteinG)}g · C{" "}
                          {formatMacro(entry.macros.carbsG)}g · F{" "}
                          {formatMacro(entry.macros.fatG)}g
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${entry.name}`}
                        onClick={() => removeEntry(entry.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MacroStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 px-3 py-3 sm:px-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
        {value}
        <span className="ml-1 text-xs font-sans font-normal text-muted-foreground">
          {unit}
        </span>
      </p>
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
