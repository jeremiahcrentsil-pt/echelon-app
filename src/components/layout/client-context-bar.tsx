"use client";

import Link from "next/link";

/**
 * Legacy mock client switcher — unused by app layouts (SessionBar replaced it).
 * Kept so imports don’t break; do not wire back into client views.
 */
export function ClientContextBar() {
  return (
    <div className="mb-6 flex flex-col gap-2 rounded-xl border border-border/50 bg-secondary/25 px-3 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        Viewing as the signed-in client — data is scoped by session, not a mock
        switcher.
      </p>
      <Link
        href="/coach"
        className="font-medium text-primary transition-colors hover:text-primary/80"
      >
        Open coach tools →
      </Link>
    </div>
  );
}
