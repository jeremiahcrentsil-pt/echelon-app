"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { fetchClients, type MockClient } from "@/lib/data/clients";

export function CoachRoster() {
  const [clients, setClients] = useState<MockClient[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchClients();
        if (cancelled) return;
        setClients(data);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load roster",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading roster…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <p>{errorMessage}</p>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No clients on the roster yet.</p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {clients.map((client) => (
        <li
          key={client.id}
          className="rounded-2xl border border-border/60 bg-card/55 p-4"
        >
          <p className="font-display text-lg font-semibold">{client.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-primary">
            {client.phase}
          </p>
        </li>
      ))}
    </ul>
  );
}
