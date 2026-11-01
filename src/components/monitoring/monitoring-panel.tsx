"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  draftToEntry,
  emptyDraft,
  entryForDate,
  entryToDraft,
  formatDayLabel,
  loadEntries,
  recentEntries,
  saveEntries,
  SCALE_LABELS,
  todayKey,
  type MonitoringDraft,
  type MonitoringEntry,
} from "@/lib/data/monitoring";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error";

export function MonitoringPanel() {
  const [entries, setEntries] = useState<MonitoringEntry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [date] = useState(todayKey);
  const [draft, setDraft] = useState<MonitoringDraft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      try {
        const data = loadEntries();
        if (cancelled) return;
        setEntries(data);
        const today = entryForDate(data, date);
        if (today) setDraft(entryToDraft(today));
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load monitoring",
        );
        setStatus("error");
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [date]);

  const todayEntry = useMemo(
    () => entryForDate(entries, date),
    [entries, date],
  );
  const history = useMemo(() => recentEntries(entries, 7), [entries]);

  function persist(next: MonitoringEntry[]) {
    saveEntries(next);
    setEntries(next);
    setStatus("ready");
  }

  function handleSave() {
    startTransition(() => {
      if (!draft.steps.trim() && !draft.waterLiters.trim()) {
        setFormError("Add at least steps or water for today.");
        return;
      }
      setFormError(null);
      const entry = draftToEntry(draft, date, todayEntry?.id);
      const withoutToday = entries.filter((item) => item.date !== date);
      persist([entry, ...withoutToday]);
      setSaved(true);
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading daily monitoring…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-6 animate-rise">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" aria-hidden />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load monitoring
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button
          className="mt-4"
          onClick={() => {
            setStatus("loading");
            setErrorMessage(null);
            try {
              const data = loadEntries();
              setEntries(data);
              const today = entryForDate(data, date);
              if (today) setDraft(entryToDraft(today));
              setStatus("ready");
            } catch (error) {
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Failed to load monitoring",
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
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">
          Daily pulse
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Monitoring
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          A short recurring check — steps, water, mood, and readiness — so trends
          stay visible without a long form.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-border/60 bg-card/50 p-4 animate-rise stagger-1">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Today’s status
        </p>
        <p className="mt-1 font-display text-lg font-semibold tracking-tight">
          {formatDayLabel(date)}
        </p>
        {todayEntry ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Logged · {todayEntry.steps.toLocaleString()} steps ·{" "}
            {todayEntry.waterLiters} L water · readiness {todayEntry.readiness}/5
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Not logged yet — fill the form below.
          </p>
        )}
      </section>

      <section className="mb-8 rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-sm sm:p-6 animate-rise stagger-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {todayEntry ? "Update today" : "Log today"}
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mon-steps">Steps</Label>
            <Input
              id="mon-steps"
              inputMode="numeric"
              placeholder="8000"
              value={draft.steps}
              onChange={(event) =>
                setDraft((current) => ({ ...current, steps: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mon-water">Water (liters)</Label>
            <Input
              id="mon-water"
              inputMode="decimal"
              placeholder="2.5"
              value={draft.waterLiters}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  waterLiters: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <ScaleField
          label="Readiness"
          value={draft.readiness}
          onChange={(value) =>
            setDraft((current) => ({ ...current, readiness: value }))
          }
        />
        <ScaleField
          label="Mood"
          value={draft.mood}
          onChange={(value) =>
            setDraft((current) => ({ ...current, mood: value }))
          }
        />
        <ScaleField
          label="Sleep quality"
          value={draft.sleepQuality}
          onChange={(value) =>
            setDraft((current) => ({ ...current, sleepQuality: value }))
          }
        />

        <div className="mt-4 space-y-2">
          <Label htmlFor="mon-notes">Notes (optional)</Label>
          <Textarea
            id="mon-notes"
            placeholder="Travel, late night, great session…"
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : todayEntry ? "Update today" : "Save today"}
          </Button>
          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-primary">
              <Check className="size-4" />
              Saved for today.
            </p>
          )}
        </div>
        {formError && (
          <p className="mt-3 flex items-center gap-2 text-sm text-destructive" role="alert">
            <AlertCircle className="size-4 shrink-0" />
            {formError}
          </p>
        )}
      </section>

      <section className="animate-rise stagger-3">
        <h2 className="mb-3 font-display text-xl font-semibold tracking-tight">
          Recent history
        </h2>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center">
            <h3 className="font-display text-lg font-semibold">No days logged</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Save today’s pulse to start a short history.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <p className="font-medium">{formatDayLabel(entry.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.steps.toLocaleString()} steps · {entry.waterLiters} L
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Readiness {entry.readiness}/5 ({SCALE_LABELS[entry.readiness]}) ·
                  Mood {entry.mood}/5 · Sleep {entry.sleepQuality}/5
                </p>
                {entry.notes && (
                  <p className="mt-1 text-sm text-foreground/85">{entry.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ScaleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      <Label>
        {label}
        <span className="ml-2 font-normal text-muted-foreground">
          {SCALE_LABELS[Number.parseInt(value, 10)] ?? ""}
        </span>
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(String(n))}
            className={cn(
              "size-9 rounded-lg border text-sm transition-colors",
              value === String(n)
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
