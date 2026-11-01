"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  loadActiveClientId,
  MOCK_CLIENTS,
  saveActiveClientId,
} from "@/lib/data/clients";

export function ClientContextBar() {
  const [clientId, setClientId] = useState(MOCK_CLIENTS[0].id);

  useEffect(() => {
    setClientId(loadActiveClientId());
  }, []);

  return (
    <div className="mb-6 flex flex-col gap-2 rounded-xl border border-border/50 bg-secondary/25 px-3 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <label className="flex flex-wrap items-center gap-2">
        <span className="uppercase tracking-[0.16em]">Viewing as</span>
        <select
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={clientId}
          onChange={(event) => {
            const next = event.target.value;
            saveActiveClientId(next);
            setClientId(next);
            window.location.reload();
          }}
          aria-label="Active mock client"
        >
          {MOCK_CLIENTS.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      <Link
        href="/coach"
        className="font-medium text-primary transition-colors hover:text-primary/80"
      >
        Open coach tools →
      </Link>
    </div>
  );
}
