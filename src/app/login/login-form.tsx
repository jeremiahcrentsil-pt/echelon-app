"use client";

import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  {
    role: "Coach",
    email: "jeremiah@echelon.local",
    password: "coach123",
    name: "Jeremiah",
  },
  {
    role: "Client",
    email: "alex@example.com",
    password: "client123",
    name: "Alex Rivera",
  },
  {
    role: "Client",
    email: "sam@example.com",
    password: "client123",
    name: "Sam Chen",
  },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/workouts";
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("client123");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }
      const me = await fetch("/api/me").then((r) => r.json());
      const dest =
        me?.user?.role === "coach" &&
        (callbackUrl === "/workouts" || callbackUrl === "/")
          ? "/coach"
          : callbackUrl.startsWith("/")
            ? callbackUrl
            : "/workouts";
      router.replace(dest);
      router.refresh();
    });
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-border/60 bg-secondary/20 p-6 backdrop-blur-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="mt-6 space-y-2">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Demo accounts
        </p>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
                setError(null);
              }}
            >
              <span className="font-medium text-foreground">{account.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {account.role} · {account.email}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
