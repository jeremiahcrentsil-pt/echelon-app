"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  Camera,
  Columns2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api/http";
import {
  compressImageFile,
  createId,
  estimateStoreBytes,
  formatPhotoDate,
  groupByDate,
  MAX_PHOTOS,
  MAX_STORE_BYTES,
  POSE_LABELS,
  POSES,
  todayKey,
  type PhotoPose,
  type ProgressPhoto,
} from "@/lib/data/progress-photos";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error" | "empty";
type ViewMode = "timeline" | "compare";

async function fetchPhotos() {
  const data = await apiJson<{ photos: ProgressPhoto[] }>("/api/progress-photos");
  return data.photos;
}

export function ProgressPhotosPanel() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("timeline");
  const [composerOpen, setComposerOpen] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [pose, setPose] = useState<PhotoPose>("front");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<CompressPreview | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchPhotos();
        if (cancelled) return;
        setPhotos(data);
        setStatus(data.length === 0 ? "empty" : "ready");
        if (data.length >= 2) {
          const chronological = [...data].sort((a, b) =>
            a.date.localeCompare(b.date),
          );
          setCompareA(chronological[0]?.id ?? null);
          setCompareB(chronological[chronological.length - 1]?.id ?? null);
        }
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load progress photos",
        );
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => groupByDate(photos), [photos]);
  const storeKb = Math.round(estimateStoreBytes(photos) / 1024);
  const photoA = photos.find((photo) => photo.id === compareA) ?? null;
  const photoB = photos.find((photo) => photo.id === compareB) ?? null;

  async function onFilePicked(file: File | null) {
    if (!file) return;
    setFormError(null);
    try {
      const compressed = await compressImageFile(file);
      setPendingFile(compressed);
      setPreview(compressed.dataUrl);
    } catch (error) {
      setPendingFile(null);
      setPreview(null);
      setFormError(
        error instanceof Error ? error.message : "Could not process that image",
      );
    }
  }

  function handleSave() {
    startTransition(async () => {
      if (!pendingFile) {
        setFormError("Choose a photo first.");
        return;
      }
      if (photos.length >= MAX_PHOTOS) {
        setFormError(`Photo limit reached (${MAX_PHOTOS}). Delete an older shot first.`);
        return;
      }
      const nextPhoto: ProgressPhoto = {
        id: createId("pp"),
        date,
        pose,
        note: note.trim() || undefined,
        dataUrl: pendingFile.dataUrl,
        width: pendingFile.width,
        height: pendingFile.height,
        bytesApprox: pendingFile.bytesApprox,
        createdAt: new Date().toISOString(),
      };
      const next = [nextPhoto, ...photos];
      if (estimateStoreBytes(next) > MAX_STORE_BYTES) {
        setFormError(
          "Storage budget full. Delete older photos or use a smaller image.",
        );
        return;
      }
      try {
        const { photo: created } = await apiJson<{ photo: ProgressPhoto }>(
          "/api/progress-photos",
          {
            method: "POST",
            body: JSON.stringify({ photo: nextPhoto }),
          },
        );
        const updated = [created, ...photos];
        setPhotos(updated);
        setStatus(updated.length === 0 ? "empty" : "ready");
        setFormError(null);
        setComposerOpen(false);
        setPendingFile(null);
        setPreview(null);
        setNote("");
        setPose("front");
        setDate(todayKey());
        if (fileRef.current) fileRef.current.value = "";
        if (!compareA) setCompareA(created.id);
        else if (!compareB) setCompareB(created.id);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to save photo",
        );
      }
    });
  }

  function deletePhoto(id: string) {
    startTransition(async () => {
      try {
        await apiJson<{ ok: boolean }>(
          `/api/progress-photos?id=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        const next = photos.filter((photo) => photo.id !== id);
        setPhotos(next);
        setStatus(next.length === 0 ? "empty" : "ready");
        if (compareA === id) setCompareA(next[0]?.id ?? null);
        if (compareB === id) setCompareB(next[1]?.id ?? next[0]?.id ?? null);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to delete photo",
        );
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground animate-fade">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading progress photos…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/10 p-6 animate-rise">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <h2 className="font-display text-lg font-semibold">
            Couldn’t load photos
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button
          className="mt-4"
          onClick={() => {
            setStatus("loading");
            void (async () => {
              try {
                const data = await fetchPhotos();
                setPhotos(data);
                setStatus(data.length === 0 ? "empty" : "ready");
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Failed to load progress photos",
                );
                setStatus("error");
              }
            })();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">
            Visual progress
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Progress photos
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Capture dated front, side, and back shots in a consistent setup, then
            compare across weeks. Photos are compressed before upload (
            {photos.length}/{MAX_PHOTOS} · ~{storeKb} KB).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={view === "timeline" ? "default" : "outline"}
            onClick={() => setView("timeline")}
          >
            <Camera className="size-4" />
            Timeline
          </Button>
          <Button
            variant={view === "compare" ? "default" : "outline"}
            onClick={() => setView("compare")}
          >
            <Columns2 className="size-4" />
            Compare
          </Button>
          <Button
            onClick={() => {
              setComposerOpen((open) => !open);
              setFormError(null);
            }}
          >
            <Plus className="size-4" />
            {composerOpen ? "Close" : "Add photo"}
          </Button>
        </div>
      </header>

      {composerOpen && (
        <section className="mb-8 rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-sm sm:p-6 animate-rise">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            New progress shot
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pp-date">Date</Label>
              <Input
                id="pp-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pose</Label>
              <div className="flex flex-wrap gap-2">
                {POSES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPose(item)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      pose === item
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {POSE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pp-file">Photo</Label>
              <Input
                id="pp-file"
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) =>
                  void onFilePicked(event.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-muted-foreground">
                File picker or phone camera. Images are resized and JPEG-compressed
                before saving.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pp-note">Note (optional)</Label>
              <Input
                id="pp-note"
                placeholder="Lighting, time of day, pump…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>

          {preview && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border/60 bg-secondary/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Selected progress photo preview"
                className="mx-auto max-h-72 object-contain"
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={isPending || !pendingFile}>
              {isPending ? "Saving…" : "Save to timeline"}
            </Button>
          </div>
          {formError && (
            <p className="mt-3 flex items-center gap-2 text-sm text-destructive" role="alert">
              <AlertCircle className="size-4 shrink-0" />
              {formError}
            </p>
          )}
        </section>
      )}

      {view === "compare" ? (
        <CompareView
          photos={photos}
          photoA={photoA}
          photoB={photoB}
          compareA={compareA}
          compareB={compareB}
          onSelectA={setCompareA}
          onSelectB={setCompareB}
        />
      ) : status === "empty" ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center animate-rise">
          <Camera className="mx-auto size-8 text-primary" />
          <h2 className="mt-4 font-display text-2xl font-semibold">No photos yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Add your first dated shot to start a visual timeline.
          </p>
          {!composerOpen && (
            <Button className="mt-6" onClick={() => setComposerOpen(true)}>
              <Plus className="size-4" />
              Add photo
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-rise stagger-1">
          {grouped.map(([day, dayPhotos]) => (
            <section key={day}>
              <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
                {formatPhotoDate(day)}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dayPhotos.map((photo) => (
                  <li
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-border/60 bg-card/55"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.dataUrl}
                      alt={`${POSE_LABELS[photo.pose]} progress photo on ${photo.date}`}
                      className="aspect-[3/4] w-full object-cover"
                    />
                    <div className="flex items-start justify-between gap-2 p-3">
                      <div>
                        <p className="text-sm font-medium">
                          {POSE_LABELS[photo.pose]}
                        </p>
                        {photo.note && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {photo.note}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete photo"
                        onClick={() => deletePhoto(photo.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

type CompressPreview = {
  dataUrl: string;
  width: number;
  height: number;
  bytesApprox: number;
};

function CompareView({
  photos,
  photoA,
  photoB,
  compareA,
  compareB,
  onSelectA,
  onSelectB,
}: {
  photos: ProgressPhoto[];
  photoA: ProgressPhoto | null;
  photoB: ProgressPhoto | null;
  compareA: string | null;
  compareB: string | null;
  onSelectA: (id: string) => void;
  onSelectB: (id: string) => void;
}) {
  if (photos.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-14 text-center animate-rise">
        <Columns2 className="mx-auto size-8 text-primary" />
        <h2 className="mt-4 font-display text-xl font-semibold">Need two shots</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Add at least two dated photos to compare progress side by side.
        </p>
      </div>
    );
  }

  const options = [...photos].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4 animate-rise">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectPhoto
          label="Earlier / left"
          value={compareA}
          options={options}
          onChange={onSelectA}
        />
        <SelectPhoto
          label="Later / right"
          value={compareB}
          options={options}
          onChange={onSelectB}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CompareFrame photo={photoA} emptyLabel="Pick a left photo" />
        <CompareFrame photo={photoB} emptyLabel="Pick a right photo" />
      </div>
    </div>
  );
}

function SelectPhoto({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: ProgressPhoto[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>
          Choose photo
        </option>
        {options.map((photo) => (
          <option key={photo.id} value={photo.id}>
            {photo.date} · {POSE_LABELS[photo.pose]}
            {photo.note ? ` · ${photo.note}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function CompareFrame({
  photo,
  emptyLabel,
}: {
  photo: ProgressPhoto | null;
  emptyLabel: string;
}) {
  if (!photo) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <figure className="overflow-hidden rounded-2xl border border-border/60 bg-card/55">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.dataUrl}
        alt={`${POSE_LABELS[photo.pose]} on ${photo.date}`}
        className="aspect-[3/4] w-full object-cover"
      />
      <figcaption className="p-3 text-sm">
        <p className="font-medium">
          {formatPhotoDate(photo.date)} · {POSE_LABELS[photo.pose]}
        </p>
        {photo.note && (
          <p className="mt-1 text-xs text-muted-foreground">{photo.note}</p>
        )}
      </figcaption>
    </figure>
  );
}
