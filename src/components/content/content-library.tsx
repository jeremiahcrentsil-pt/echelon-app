"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  FileText,
  Film,
  Loader2,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONTENT_CATEGORIES,
  CONTENT_LIBRARY,
  filterContent,
  formatPostedAt,
  getContentById,
  loadSavedIds,
  saveSavedIds,
  TYPE_LABELS,
  type ContentCategory,
  type ContentItem,
  type ContentType,
} from "@/lib/data/content";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error";

const TYPE_FILTERS: Array<ContentType | "All"> = ["All", "pdf", "video", "doc"];

export function ContentLibrary() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ContentCategory | "All">("All");
  const [type, setType] = useState<ContentType | "All">("All");
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    CONTENT_LIBRARY[0]?.id ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      try {
        const ids = loadSavedIds();
        if (cancelled) return;
        setSavedIds(ids);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load saved content",
        );
        setStatus("error");
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const filtered = useMemo(
    () => filterContent(query, category, type, savedOnly, savedIds),
    [query, category, type, savedOnly, savedIds],
  );

  const selected =
    (selectedId ? getContentById(selectedId) : null) ?? filtered[0] ?? null;

  function toggleSaved(id: string) {
    const next = savedIds.includes(id)
      ? savedIds.filter((item) => item !== id)
      : [...savedIds, id];
    setSavedIds(next);
    saveSavedIds(next);
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading content library…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-6 animate-rise">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load content
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button
          className="mt-4"
          onClick={() => {
            setStatus("loading");
            try {
              setSavedIds(loadSavedIds());
              setStatus("ready");
            } catch (error) {
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Failed to load saved content",
              );
              setStatus("error");
            }
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">
          Coach library
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Content
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          PDFs, videos, and short guides Jeremiah posts for the roster. Save the
          pieces you’ll reopen during the phase.
        </p>
      </header>

      <div className="mb-5 space-y-3 animate-rise stagger-1">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title, tags, or summary…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search content"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTENT_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                category === item
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setType(item)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                type === item
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {item === "All" ? "All types" : TYPE_LABELS[item]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSavedOnly((value) => !value)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs transition-colors",
              savedOnly
                ? "border-signal/50 bg-signal/15 text-signal"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Saved
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="animate-rise stagger-2">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center">
              <h2 className="font-display text-lg font-semibold">No matches</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Adjust filters or clear Saved to see the full library.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((item) => {
                const active = selected?.id === item.id;
                const saved = savedIds.includes(item.id);
                const Icon =
                  item.type === "video"
                    ? Film
                    : item.type === "pdf"
                      ? FileText
                      : BookOpen;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                        active
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/60 bg-card/50 hover:border-primary/25",
                      )}
                    >
                      <span className="mt-0.5 text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {TYPE_LABELS[item.type]} · {item.category} ·{" "}
                          {item.durationOrPages}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-0.5",
                          saved ? "text-signal" : "text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {saved ? (
                          <BookmarkCheck className="size-4" />
                        ) : (
                          <Bookmark className="size-4 opacity-50" />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="animate-rise stagger-3">
          {selected ? (
            <ContentDetail
              item={selected}
              saved={savedIds.includes(selected.id)}
              onToggleSaved={() => toggleSaved(selected.id)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
              Select an item to open details.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ContentDetail({
  item,
  saved,
  onToggleSaved,
}: {
  item: ContentItem;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
            {TYPE_LABELS[item.type]} · {item.category}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {item.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Posted {formatPostedAt(item.postedAt)} · {item.durationOrPages}
          </p>
        </div>
        <Button
          variant={saved ? "default" : "outline"}
          size="sm"
          onClick={onToggleSaved}
        >
          {saved ? (
            <>
              <BookmarkCheck className="size-3.5" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="size-3.5" />
              Save
            </>
          )}
        </Button>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground/90">
        {item.summary}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {item.body}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border/60 bg-secondary/35">
        {item.type === "video" && item.openHref ? (
          <video
            className="aspect-video w-full bg-black/40"
            controls
            preload="metadata"
            src={item.openHref}
          >
            Your browser can’t play this demo clip.
          </video>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            {item.type === "pdf" ? (
              <FileText className="size-8 text-primary" aria-hidden />
            ) : item.type === "video" ? (
              <Film className="size-8 text-primary" aria-hidden />
            ) : (
              <BookOpen className="size-8 text-primary" aria-hidden />
            )}
            <p className="text-sm font-medium">
              {item.type === "pdf"
                ? "PDF preview placeholder"
                : item.type === "video"
                  ? "Video placeholder"
                  : "Document preview"}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Mock coach media for the client library — open the linked sample
              when available.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        {item.openHref ? (
          <Button render={<a href={item.openHref} target="_blank" rel="noreferrer" />}>
            <ExternalLink className="size-3.5" />
            {item.openLabel}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{item.openLabel} · in-app copy above</p>
        )}
      </div>
    </article>
  );
}
