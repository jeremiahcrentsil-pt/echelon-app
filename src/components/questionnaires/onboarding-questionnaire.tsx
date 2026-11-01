"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api/http";
import {
  emptyAnswers,
  encodeMultiAnswers,
  parseMultiAnswers,
  type QuestionnaireField,
} from "@/lib/data/questionnaire";

type Assignment = {
  id: string;
  title: string;
  description: string;
  fields: QuestionnaireField[];
};

export function OnboardingQuestionnaire() {
  const router = useRouter();
  const { update } = useSession();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "done" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiJson<{
          assignment: Assignment | null;
          onboardingComplete: boolean;
        }>("/api/questionnaires");
        if (cancelled) return;
        if (data.onboardingComplete) {
          setStatus("done");
          router.replace("/workouts");
          return;
        }
        if (!data.assignment) {
          setErrorMessage("No onboarding questionnaire is assigned yet.");
          setStatus("error");
          return;
        }
        setAssignment(data.assignment);
        setAnswers(emptyAnswers(data.assignment.fields));
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load questionnaire",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!assignment) return;
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await apiJson("/api/questionnaires", {
          method: "POST",
          body: JSON.stringify({
            assignmentId: assignment.id,
            answers,
          }),
        });
        await update();
        router.replace("/workouts");
        router.refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Could not submit questionnaire",
        );
      }
    });
  }

  if (status === "loading" || status === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading…
      </div>
    );
  }

  if (status === "error" || !assignment) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-4" />
          <p className="font-medium">Couldn’t load onboarding</p>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-border/60 bg-card/40 p-5 animate-rise sm:p-6"
    >
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {assignment.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{assignment.description}</p>
      </div>

      {assignment.fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required ? " *" : ""}
          </Label>
          {field.type === "textarea" ? (
            <Textarea
              id={field.id}
              value={answers[field.id] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) =>
                setAnswers((current) => ({ ...current, [field.id]: e.target.value }))
              }
              required={field.required}
              rows={3}
            />
          ) : field.type === "select" ? (
            <select
              id={field.id}
              className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={answers[field.id] ?? ""}
              onChange={(e) =>
                setAnswers((current) => ({ ...current, [field.id]: e.target.value }))
              }
              required={field.required}
            >
              <option value="">Select…</option>
              {(field.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.type === "multiselect" ? (
            <div className="space-y-2 rounded-lg border border-border/50 bg-secondary/15 p-3">
              {(field.options ?? []).map((option) => {
                const selected = parseMultiAnswers(answers[field.id]).includes(
                  option,
                );
                return (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border"
                      checked={selected}
                      onChange={(event) => {
                        const current = parseMultiAnswers(answers[field.id]);
                        const next = event.target.checked
                          ? [...current, option]
                          : current.filter((item) => item !== option);
                        setAnswers((prev) => ({
                          ...prev,
                          [field.id]: encodeMultiAnswers(next),
                        }));
                      }}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          ) : field.type === "scale" ? (
            <Input
              id={field.id}
              type="number"
              min={field.min ?? 1}
              max={field.max ?? 10}
              value={answers[field.id] ?? ""}
              onChange={(e) =>
                setAnswers((current) => ({ ...current, [field.id]: e.target.value }))
              }
              required={field.required}
            />
          ) : (
            <Input
              id={field.id}
              type={field.type === "number" ? "number" : "text"}
              value={answers[field.id] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) =>
                setAnswers((current) => ({ ...current, [field.id]: e.target.value }))
              }
              required={field.required}
            />
          )}
        </div>
      ))}

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit and continue"
        )}
      </Button>
    </form>
  );
}
