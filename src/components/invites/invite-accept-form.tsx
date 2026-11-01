"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api/http";

type InviteInfo = {
  name: string;
  email: string;
  coachName: string;
  templateTitle: string;
};

export function InviteAcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiJson<{ invite: InviteInfo }>(
          `/api/invites/token/${token}`,
        );
        if (cancelled) return;
        setInfo(data.invite);
        setName(data.invite.name);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Invite unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      try {
        await apiJson("/api/invites/accept", {
          method: "POST",
          body: JSON.stringify({ token, password, name }),
        });
        const result = await signIn("credentials", {
          email: info!.email,
          password,
          redirect: false,
        });
        if (result?.error) {
          setError("Account created, but sign-in failed. Try logging in.");
          router.push("/login");
          return;
        }
        router.replace("/onboarding");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not accept invite");
      }
    });
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="font-medium">Invite unavailable</p>
        </div>
        <p className="text-sm text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading invite…
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border/60 bg-secondary/20 p-6 backdrop-blur-sm"
    >
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
        <p className="font-medium text-foreground">{info.coachName} invited you</p>
        <p className="mt-1 text-xs text-muted-foreground">
          After signup you’ll complete: {info.templateTitle}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={info.email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Create password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Join Echelon"
        )}
      </Button>
    </form>
  );
}
