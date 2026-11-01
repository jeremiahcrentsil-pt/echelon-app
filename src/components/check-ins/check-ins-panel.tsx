"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertCircle, Check, ClipboardCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api/http";
import {
  ASSIGNED_FORMS,
  emptyAnswers,
  formatSubmittedAt,
  getFormById,
  summarizeAnswers,
  type CheckInFormTemplate,
  type CheckInSubmission,
} from "@/lib/data/check-ins";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error";

async function fetchSubmissions() {
  const data = await apiJson<{ submissions: CheckInSubmission[] }>(
    "/api/check-ins",
  );
  return data.submissions;
}

export function CheckInsPanel() {
  const [submissions, setSubmissions] = useState<CheckInSubmission[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFormId, setActiveFormId] = useState(ASSIGNED_FORMS[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>(
    emptyAnswers(ASSIGNED_FORMS[0]),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeForm = useMemo(
    () => getFormById(activeFormId) ?? ASSIGNED_FORMS[0],
    [activeFormId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchSubmissions();
        if (cancelled) return;
        setSubmissions(data);
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

  function selectForm(form: CheckInFormTemplate) {
    setActiveFormId(form.id);
    setAnswers(emptyAnswers(form));
    setFormError(null);
    setJustSaved(null);
  }

  function handleSubmit() {
    startTransition(async () => {
      for (const field of activeForm.fields) {
        if (field.required && !answers[field.id]?.trim()) {
          setFormError(`“${field.label}” is required.`);
          return;
        }
      }
      setFormError(null);
      try {
        const { submission } = await apiJson<{ submission: CheckInSubmission }>(
          "/api/check-ins",
          {
            method: "POST",
            body: JSON.stringify({
              formId: activeForm.id,
              formTitle: activeForm.title,
              answers: { ...answers },
            }),
          },
        );
        setSubmissions([submission, ...submissions]);
        setStatus("ready");
        setAnswers(emptyAnswers(activeForm));
        setJustSaved(activeForm.title);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to submit check-in",
        );
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading check-ins…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-6 animate-rise">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" aria-hidden />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load check-ins
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
                setSubmissions(await fetchSubmissions());
                setStatus("ready");
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to load check-ins",
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
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">
          Coach forms
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Check-ins
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Submit the forms Jeremiah assigned — weight, energy, sleep, adherence,
          and notes — then review past submissions here.
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 animate-rise stagger-1">
        {ASSIGNED_FORMS.map((form) => (
          <button
            key={form.id}
            type="button"
            onClick={() => selectForm(form)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-colors",
              activeFormId === form.id
                ? "border-primary/40 bg-primary/10"
                : "border-border/60 bg-card/50 hover:border-primary/25",
            )}
          >
            <div className="mb-2 flex items-center gap-2 text-primary">
              <ClipboardCheck className="size-4" aria-hidden />
              <span className="text-[11px] uppercase tracking-[0.18em]">
                {form.cadence}
              </span>
            </div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {form.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
          </button>
        ))}
      </section>

      <section className="mb-8 rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-sm sm:p-6 animate-rise stagger-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {activeForm.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{activeForm.description}</p>

        <div className="mt-5 space-y-4">
          {activeForm.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={`ci-${field.id}`}>
                {field.label}
                {field.required ? " *" : ""}
                {field.unit ? ` (${field.unit})` : ""}
              </Label>

              {field.type === "textarea" ? (
                <Textarea
                  id={`ci-${field.id}`}
                  placeholder={field.placeholder}
                  value={answers[field.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [field.id]: event.target.value,
                    }))
                  }
                />
              ) : field.type === "select" ? (
                <div className="flex flex-wrap gap-2">
                  {(field.options ?? []).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [field.id]: option,
                        }))
                      }
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        answers[field.id] === option
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : field.type === "scale" ? (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(
                    { length: (field.max ?? 10) - (field.min ?? 1) + 1 },
                    (_, i) => (field.min ?? 1) + i,
                  ).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [field.id]: String(n),
                        }))
                      }
                      className={cn(
                        "size-9 rounded-lg border text-sm transition-colors",
                        answers[field.id] === String(n)
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  id={`ci-${field.id}`}
                  inputMode="decimal"
                  placeholder={field.placeholder}
                  value={answers[field.id] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [field.id]: event.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Submitting…" : "Submit check-in"}
          </Button>
          {justSaved && (
            <p className="flex items-center gap-1.5 text-sm text-primary">
              <Check className="size-4" />
              {justSaved} submitted.
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
          Past submissions
        </h2>
        {submissions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center">
            <h3 className="font-display text-lg font-semibold">No check-ins yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Submit a form above to start a history your coach can review.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {submissions.map((submission) => {
              const form = getFormById(submission.formId);
              return (
                <li
                  key={submission.id}
                  className="rounded-2xl border border-border/60 bg-card/55 p-4 backdrop-blur-sm"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <h3 className="font-display text-lg font-semibold tracking-tight">
                      {submission.formTitle}
                    </h3>
                    <time
                      dateTime={submission.submittedAt}
                      className="text-xs text-muted-foreground"
                    >
                      {formatSubmittedAt(submission.submittedAt)}
                    </time>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {form
                      ? summarizeAnswers(form, submission.answers)
                      : "Submitted"}
                  </p>
                  {submission.answers.notes?.trim() && (
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                      {submission.answers.notes}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
