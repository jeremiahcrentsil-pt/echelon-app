"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api/http";
import {
  formatSubmittedAt,
  getFormById,
  summarizeAnswers,
  type CheckInSubmission,
} from "@/lib/data/check-ins";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error";

async function fetchAllSubmissions() {
  const data = await apiJson<{ submissions: CheckInSubmission[] }>(
    "/api/check-ins?scope=all",
  );
  return data.submissions;
}

export function CoachCheckInsPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<CheckInSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchAllSubmissions();
        if (cancelled) return;
        setSubmissions(data);
        setSelectedId(data[0]?.id ?? null);
        setNoteDraft(data[0]?.coachNote ?? "");
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load check-ins",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => submissions.find((item) => item.id === selectedId) ?? null,
    [submissions, selectedId],
  );

  function selectSubmission(item: CheckInSubmission) {
    setSelectedId(item.id);
    setNoteDraft(item.coachNote ?? "");
    setFlash(null);
  }

  function applySubmission(updated: CheckInSubmission) {
    setSubmissions((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  function markReviewed() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const { submission } = await apiJson<{ submission: CheckInSubmission }>(
          "/api/check-ins",
          {
            method: "PATCH",
            body: JSON.stringify({
              id: selected.id,
              coachNote: noteDraft.trim() || selected.coachNote,
              reviewed: true,
            }),
          },
        );
        applySubmission(submission);
        setFlash("Marked reviewed.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to mark reviewed",
        );
      }
    });
  }

  function saveNote() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const { submission } = await apiJson<{ submission: CheckInSubmission }>(
          "/api/check-ins",
          {
            method: "PATCH",
            body: JSON.stringify({
              id: selected.id,
              coachNote: noteDraft.trim() || undefined,
              reviewed: Boolean(selected.reviewedAt),
            }),
          },
        );
        applySubmission(submission);
        setFlash("Coach note saved.");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to save note",
        );
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm">Loading check-ins…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load check-ins
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-signal">
          Inbox
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Review check-ins
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Read client submissions, mark them reviewed, and leave a short coaching
          note.
        </p>
      </header>

      {flash && (
        <p className="mb-4 flex items-center gap-2 text-sm text-primary">
          <Check className="size-4" />
          {flash}
        </p>
      )}

      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-14 text-center">
          <h2 className="font-display text-xl font-semibold">No submissions yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When clients submit check-ins, they show up here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
          <ul className="space-y-2 animate-rise stagger-1">
            {submissions.map((item) => {
              const active = item.id === selected?.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectSubmission(item)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/60 bg-card/50 hover:border-primary/25",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.clientName}</p>
                      <span
                        className={cn(
                          "text-[11px] uppercase tracking-[0.14em]",
                          item.reviewedAt ? "text-primary" : "text-signal",
                        )}
                      >
                        {item.reviewedAt ? "Reviewed" : "New"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.formTitle} · {formatSubmittedAt(item.submittedAt)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <section className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-6 animate-rise stagger-2">
            {selected ? (
              <>
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  {selected.formTitle}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.clientName} · {formatSubmittedAt(selected.submittedAt)}
                </p>
                <p className="mt-4 text-sm text-foreground/90">
                  {getFormById(selected.formId)
                    ? summarizeAnswers(
                        getFormById(selected.formId)!,
                        selected.answers,
                      )
                    : "Submission"}
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  {Object.entries(selected.answers).map(([key, value]) => (
                    <div key={key} className="flex gap-2 border-b border-border/40 py-2">
                      <dt className="w-40 shrink-0 text-muted-foreground">{key}</dt>
                      <dd>{value || "—"}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 space-y-2">
                  <Label htmlFor="coach-note">Coach note</Label>
                  <Textarea
                    id="coach-note"
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder="Quick reply for the client record…"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={markReviewed} disabled={isPending}>
                    Mark reviewed
                  </Button>
                  <Button variant="outline" onClick={saveNote} disabled={isPending}>
                    Save note
                  </Button>
                </div>
                {selected.reviewedAt && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Reviewed {formatSubmittedAt(selected.reviewedAt)}
                    {selected.coachNote ? ` · “${selected.coachNote}”` : ""}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a submission.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
