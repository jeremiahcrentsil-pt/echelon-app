import type { Metadata } from "next";
import Link from "next/link";
import { BookPlus, ClipboardList, NotebookPen } from "lucide-react";

import { MOCK_CLIENTS } from "@/lib/data/clients";

export const metadata: Metadata = { title: "Coach" };

const LINKS = [
  {
    href: "/coach/plans",
    title: "Assign plans",
    body: "Create or assign meal and workout plans to the roster.",
    icon: NotebookPen,
  },
  {
    href: "/coach/content",
    title: "Post content",
    body: "Add PDFs, video links, and docs to the client library.",
    icon: BookPlus,
  },
  {
    href: "/coach/check-ins",
    title: "Review check-ins",
    body: "Read submissions, mark reviewed, leave a short note.",
    icon: ClipboardList,
  },
];

export default function CoachOverviewPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-signal">
          Jeremiah’s desk
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Coach
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Assign plans, post library content, and review check-ins for mock
          clients — shared with the client app via localStorage until auth lands.
        </p>
      </header>

      <section className="mb-8 animate-rise stagger-1">
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
          Roster
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MOCK_CLIENTS.map((client) => (
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
      </section>

      <section className="grid gap-3 animate-rise stagger-2">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/55 p-4 transition-colors hover:border-primary/35"
            >
              <span className="mt-0.5 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold tracking-tight">
                  {item.title}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {item.body}
                </span>
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
