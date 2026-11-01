"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api/http";
import {
  CONTENT_CATEGORIES,
  createId,
  TYPE_LABELS,
  type ContentCategory,
  type ContentItem,
  type ContentType,
} from "@/lib/data/content";
import { cn } from "@/lib/utils";

function todayKeyLike(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Status = "loading" | "ready" | "error";

export function CoachContentPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [posts, setPosts] = useState<ContentItem[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<ContentType>("doc");
  const [category, setCategory] = useState<ContentCategory>("Training");
  const [tags, setTags] = useState("coach, update");
  const [durationOrPages, setDurationOrPages] = useState("2 min read");
  const [openHref, setOpenHref] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiJson<{ items: ContentItem[]; savedIds: string[] }>(
          "/api/content",
        );
        if (cancelled) return;
        setPosts(data.items);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load posts",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handlePost() {
    startTransition(async () => {
      if (!title.trim() || !summary.trim()) {
        setFlash("Title and summary are required.");
        return;
      }
      const item: ContentItem = {
        id: createId("c"),
        title: title.trim(),
        summary: summary.trim(),
        type,
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        postedAt: todayKeyLike(),
        durationOrPages: durationOrPages.trim() || "1 min read",
        body: body.trim() || summary.trim(),
        openLabel:
          type === "pdf"
            ? "Open PDF"
            : type === "video"
              ? "Open video"
              : "Read doc",
        openHref: openHref.trim() || undefined,
      };
      try {
        const { item: created } = await apiJson<{ item: ContentItem }>(
          "/api/content",
          {
            method: "POST",
            body: JSON.stringify({ item }),
          },
        );
        setPosts((current) => [created, ...current]);
        setTitle("");
        setSummary("");
        setBody("");
        setOpenHref("");
        setFlash(`Posted “${created.title}” to the client Content library.`);
      } catch (error) {
        setFlash(
          error instanceof Error ? error.message : "Failed to post content",
        );
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm">Loading content tools…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <h2 className="font-display text-lg font-semibold">Couldn’t load posts</h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-signal">
          Library
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Post content
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          Add a PDF link, video URL, or short doc. New items appear at the top of
          the client Content library.
        </p>
      </header>

      {flash && (
        <p className="mb-4 flex items-center gap-2 text-sm text-primary">
          <Check className="size-4" />
          {flash}
        </p>
      )}

      <section className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-6 animate-rise">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-title">Title</Label>
            <Input
              id="c-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Mid-cut check-in tips"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-summary">Summary</Label>
            <Input
              id="c-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="One-line description for the library list"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-body">Body</Label>
            <Textarea
              id="c-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Longer coaching copy shown in the detail pane"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {(["pdf", "video", "doc"] as ContentType[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm",
                    type === item
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {TYPE_LABELS[item]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_CATEGORIES.filter((item) => item !== "All").map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm",
                    category === item
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-tags">Tags (comma-separated)</Label>
            <Input
              id="c-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-meta">Duration / pages</Label>
            <Input
              id="c-meta"
              value={durationOrPages}
              onChange={(event) => setDurationOrPages(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-href">Link (PDF or video URL, optional)</Label>
            <Input
              id="c-href"
              value={openHref}
              onChange={(event) => setOpenHref(event.target.value)}
              placeholder="https://"
            />
          </div>
        </div>
        <Button className="mt-5" onClick={handlePost} disabled={isPending}>
          <Plus className="size-4" />
          Post to content library
        </Button>
      </section>

      <section className="mt-8 animate-rise stagger-1">
        <h2 className="mb-3 font-display text-lg font-semibold">Your posts</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coach posts yet.</p>
        ) : (
          <ul className="space-y-2">
            {posts.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-sm"
              >
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {TYPE_LABELS[item.type]} · {item.category} · {item.postedAt}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
