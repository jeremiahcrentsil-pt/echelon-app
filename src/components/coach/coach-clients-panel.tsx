"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Copy, Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api/http";
import type { QuestionnaireField } from "@/lib/data/questionnaire";
import { cn } from "@/lib/utils";

type InviteRow = {
  id: string;
  token: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  inviteUrl: string;
  template: { id: string; title: string } | null;
  acceptedUser: {
    id: string;
    name: string;
    email: string;
    onboardingCompletedAt: string | null;
  } | null;
};

type ClientRow = {
  id: string;
  name: string;
  email: string;
  phase: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
};

type SubmissionRow = {
  id: string;
  submittedAt: string;
  reviewedAt: string | null;
  coachNote: string | null;
  answers: Record<string, string>;
  client: { id: string; name: string; email: string };
  templateTitle: string;
  fields: QuestionnaireField[];
};

export function CoachClientsPanel() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  async function reload() {
    const [roster, review] = await Promise.all([
      apiJson<{ invites: InviteRow[]; clients: ClientRow[] }>("/api/invites"),
      apiJson<{ submissions: SubmissionRow[] }>("/api/questionnaires?scope=review"),
    ]);
    setInvites(roster.invites);
    setClients(roster.clients);
    setSubmissions(review.submissions);
    setNoteDrafts(
      Object.fromEntries(
        review.submissions.map((row) => [row.id, row.coachNote ?? ""]),
      ),
    );
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
        if (cancelled) return;
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load clients",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleInvite(event: FormEvent) {
    event.preventDefault();
    setFlash(null);
    setLastInviteUrl(null);
    startTransition(async () => {
      try {
        const data = await apiJson<{
          invite: InviteRow;
          delivery: { mode: string; inviteUrl: string; message: string };
        }>("/api/invites", {
          method: "POST",
          body: JSON.stringify({ name, email }),
        });
        setName("");
        setEmail("");
        setLastInviteUrl(data.delivery.inviteUrl);
        setFlash(data.delivery.message);
        await reload();
        setStatus("ready");
      } catch (error) {
        setFlash(error instanceof Error ? error.message : "Invite failed");
      }
    });
  }

  function handleReview(submissionId: string) {
    startTransition(async () => {
      try {
        await apiJson("/api/questionnaires", {
          method: "PATCH",
          body: JSON.stringify({
            submissionId,
            coachNote: noteDrafts[submissionId] ?? "",
            reviewed: true,
          }),
        });
        await reload();
        setFlash("Questionnaire marked reviewed.");
      } catch (error) {
        setFlash(error instanceof Error ? error.message : "Review failed");
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading clients…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
        <div className="mb-1 flex items-center gap-2">
          <AlertCircle className="size-4" />
          Couldn’t load clients
        </div>
        <p className="text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  const pending = invites.filter((invite) => invite.status === "pending");

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <UserPlus className="size-4" />
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Invite a client
          </h2>
        </div>
        <form onSubmit={handleInvite} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jordan Lee"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jordan@example.com"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Create invite"
              )}
            </Button>
          </div>
        </form>
        {flash ? (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {flash}
          </p>
        ) : null}
        {lastInviteUrl ? (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center">
            <code className="flex-1 break-all text-xs text-foreground">
              {lastInviteUrl}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(lastInviteUrl);
                setFlash("Invite URL copied.");
              }}
            >
              <Copy className="size-3.5" />
              Copy link
            </Button>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
          Pending invites
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((invite) => (
              <li
                key={invite.id}
                className="rounded-2xl border border-border/50 bg-secondary/20 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{invite.name}</p>
                    <p className="text-sm text-muted-foreground">{invite.email}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-signal">
                      Pending · {invite.template?.title ?? "Onboarding"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await navigator.clipboard.writeText(invite.inviteUrl);
                      setFlash(`Copied invite for ${invite.name}.`);
                    }}
                  >
                    <Copy className="size-3.5" />
                    Copy link
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
          Accepted clients
        </h2>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No clients linked yet — send an invite to get started.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {clients.map((client) => (
              <li
                key={client.id}
                className="rounded-2xl border border-border/60 bg-card/55 p-4"
              >
                <p className="font-display text-lg font-semibold">{client.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-primary">
                  {client.phase || "Client"}
                  {client.onboardingCompletedAt ? " · Onboarded" : " · Questionnaire pending"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
          Onboarding questionnaires
        </h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No questionnaire submissions yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {submissions.map((submission) => (
              <li
                key={submission.id}
                className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-semibold">
                      {submission.client.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {submission.templateTitle} ·{" "}
                      {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]",
                      submission.reviewedAt
                        ? "bg-primary/15 text-primary"
                        : "bg-signal/15 text-signal",
                    )}
                  >
                    {submission.reviewedAt ? "Reviewed" : "Needs review"}
                  </span>
                </div>
                <dl className="space-y-2 text-sm">
                  {submission.fields.map((field) => {
                    const value = submission.answers[field.id];
                    if (!value?.trim()) return null;
                    return (
                      <div key={field.id}>
                        <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {field.label}
                        </dt>
                        <dd className="mt-0.5 text-foreground">{value}</dd>
                      </div>
                    );
                  })}
                </dl>
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`note-${submission.id}`}>Coach note</Label>
                  <Textarea
                    id={`note-${submission.id}`}
                    rows={2}
                    value={noteDrafts[submission.id] ?? ""}
                    onChange={(e) =>
                      setNoteDrafts((current) => ({
                        ...current,
                        [submission.id]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleReview(submission.id)}
                  >
                    <Check className="size-3.5" />
                    Mark reviewed
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
