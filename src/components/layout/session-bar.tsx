"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SessionBar({ variant }: { variant: "client" | "coach" }) {
  const { data } = useSession();
  const user = data?.user;

  return (
    <div className="mb-6 flex flex-col gap-2 rounded-xl border border-border/50 bg-secondary/25 px-3 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="uppercase tracking-[0.16em]">Signed in</span>
        <span className="text-sm text-foreground">
          {user?.name ?? "…"}
          {user?.role ? (
            <span className="ml-2 text-xs text-muted-foreground">
              · {user.role}
              {user.phase ? ` · ${user.phase}` : ""}
            </span>
          ) : null}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {variant === "client" && user?.role === "coach" ? (
          <Link
            href="/coach"
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            Open coach tools →
          </Link>
        ) : null}
        {variant === "coach" ? (
          <Link
            href="/workouts"
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            View client app →
          </Link>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
