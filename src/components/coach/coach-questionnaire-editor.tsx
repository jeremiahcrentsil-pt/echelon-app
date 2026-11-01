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
import {
  emptyQuestionnaireField,
  FIELD_TYPE_OPTIONS,
  normalizeFields,
  type QuestionnaireField,
  type QuestionnaireFieldType,
  type QuestionnaireTemplateData,
} from "@/lib/data/questionnaire";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error";

export function CoachQuestionnaireEditor() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("Initial client questionnaire");
  const [description, setDescription] = useState(
    "Goals, experience, and availability so coaching can start sharp.",
  );
  const [fields, setFields] = useState<QuestionnaireField[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiJson<{ template: QuestionnaireTemplateData | null }>(
          "/api/questionnaires?scope=template",
        );
        if (cancelled) return;
        if (data.template) {
          setTemplateId(data.template.id);
          setTitle(data.template.title);
          setDescription(data.template.description);
          setFields(
            data.template.fields.length > 0
              ? data.template.fields
              : [emptyQuestionnaireField("textarea")],
          );
        } else {
          setFields([
            emptyQuestionnaireField("textarea"),
            emptyQuestionnaireField("select"),
          ]);
        }
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
  }, []);

  function updateField(index: number, patch: Partial<QuestionnaireField>) {
    setFields((current) =>
      current.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    );
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  function changeType(index: number, type: QuestionnaireFieldType) {
    setFields((current) =>
      current.map((field, i) => {
        if (i !== index) return field;
        const next: QuestionnaireField = { ...field, type };
        if (type === "select" || type === "multiselect") {
          next.options =
            field.options && field.options.length > 0
              ? field.options
              : ["Option 1", "Option 2"];
        } else {
          delete next.options;
        }
        if (type === "scale") {
          next.min = field.min ?? 1;
          next.max = field.max ?? 10;
        }
        return next;
      }),
    );
  }

  function save() {
    startTransition(async () => {
      setFlash(null);
      const normalized = normalizeFields(fields);
      if (normalized.length === 0) {
        setFlash("Add at least one question with a label.");
        return;
      }
      if (!title.trim()) {
        setFlash("Add a form title.");
        return;
      }
      try {
        const { template } = await apiJson<{
          template: QuestionnaireTemplateData;
        }>("/api/questionnaires", {
          method: "PUT",
          body: JSON.stringify({
            templateId: templateId ?? undefined,
            title: title.trim(),
            description: description.trim(),
            fields: normalized,
          }),
        });
        setTemplateId(template.id);
        setFields(template.fields);
        setFlash(
          "Saved. New invites will use this form; existing submissions keep their original questions.",
        );
      } catch (error) {
        setFlash(
          error instanceof Error ? error.message : "Failed to save questionnaire",
        );
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm">Loading questionnaire…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load questionnaire
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
          Onboarding
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Questionnaire editor
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Add, remove, and reorder questions for the form new clients fill after
          accepting an invite. Edits apply to new invites only — past submissions
          stay readable as submitted.
        </p>
      </header>

      {flash && (
        <p className="flex items-start gap-2 text-sm text-primary animate-fade">
          <Check className="mt-0.5 size-4 shrink-0" />
          {flash}
        </p>
      )}

      <section className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-6 animate-rise stagger-1">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="q-title">Form title</Label>
            <Input
              id="q-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-desc">Description</Label>
            <Textarea
              id="q-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Questions</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setFields((current) => [
                  ...current,
                  emptyQuestionnaireField("text"),
                ])
              }
            >
              <Plus className="size-3.5" />
              Add question
            </Button>
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-border/50 bg-secondary/20 p-3 sm:p-4"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Question {index + 1}
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={index === 0}
                    aria-label="Move up"
                    onClick={() => moveField(index, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={index === fields.length - 1}
                    aria-label="Move down"
                    onClick={() => moveField(index, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove question"
                      onClick={() =>
                        setFields((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1.4fr_10rem]">
                <div className="space-y-2">
                  <Label htmlFor={`label-${field.id}`}>Label</Label>
                  <Input
                    id={`label-${field.id}`}
                    value={field.label}
                    placeholder="Question for the client"
                    onChange={(event) =>
                      updateField(index, { label: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`type-${field.id}`}>Type</Label>
                  <select
                    id={`type-${field.id}`}
                    className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={field.type}
                    onChange={(event) =>
                      changeType(
                        index,
                        event.target.value as QuestionnaireFieldType,
                      )
                    }
                  >
                    {FIELD_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(field.type === "text" || field.type === "textarea") && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`ph-${field.id}`}>Placeholder</Label>
                  <Input
                    id={`ph-${field.id}`}
                    value={field.placeholder ?? ""}
                    onChange={(event) =>
                      updateField(index, {
                        placeholder: event.target.value || undefined,
                      })
                    }
                  />
                </div>
              )}

              {(field.type === "select" || field.type === "multiselect") && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`opts-${field.id}`}>
                    Choices (one per line)
                  </Label>
                  <Textarea
                    id={`opts-${field.id}`}
                    rows={3}
                    value={(field.options ?? []).join("\n")}
                    onChange={(event) =>
                      updateField(index, {
                        options: event.target.value.split("\n"),
                      })
                    }
                  />
                </div>
              )}

              {field.type === "scale" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`min-${field.id}`}>Min</Label>
                    <Input
                      id={`min-${field.id}`}
                      type="number"
                      value={field.min ?? 1}
                      onChange={(event) =>
                        updateField(index, {
                          min: Number.parseInt(event.target.value, 10) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`max-${field.id}`}>Max</Label>
                    <Input
                      id={`max-${field.id}`}
                      type="number"
                      value={field.max ?? 10}
                      onChange={(event) =>
                        updateField(index, {
                          max: Number.parseInt(event.target.value, 10) || 10,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <label
                className={cn(
                  "mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={Boolean(field.required)}
                  onChange={(event) =>
                    updateField(index, { required: event.target.checked })
                  }
                />
                Required
              </label>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save questionnaire"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFields((current) => [
                ...current,
                emptyQuestionnaireField("multiselect"),
              ])
            }
          >
            <Plus className="size-4" />
            Multi-choice question
          </Button>
        </div>
      </section>
    </div>
  );
}
