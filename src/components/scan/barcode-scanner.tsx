"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  Loader2,
  ScanBarcode,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loadEntries,
  MEAL_LABELS,
  MEAL_ORDER,
  productToEntry,
  saveEntries,
  todayKey,
  type MealType,
} from "@/lib/data/nutrition";
import {
  DEMO_BARCODES,
  MOCK_CATALOG,
  type FoodProduct,
} from "@/lib/foods/mock-catalog";
import { cn } from "@/lib/utils";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; product: FoodProduct; via: string };

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: {
      formats?: string[];
    }) => BarcodeDetectorLike;
  }
}

export function BarcodeScanner() {
  const [barcode, setBarcode] = useState("");
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [meal, setMeal] = useState<MealType>("snack");
  const [servings, setServings] = useState("1");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function lookupCode(code: string) {
    const normalized = code.replace(/\s+/g, "");
    if (!normalized) return;
    setSavedName(null);
    setLookup({ status: "loading" });
    try {
      const response = await fetch(
        `/api/foods/barcode/${encodeURIComponent(normalized)}`,
      );
      const data = (await response.json()) as
        | { ok: true; product: FoodProduct; via: string }
        | { ok: false; error: string };

      if (!data.ok) {
        setLookup({ status: "error", message: data.error });
        return;
      }
      setBarcode(data.product.barcode);
      setLookup({
        status: "ready",
        product: data.product,
        via: data.via,
      });
    } catch {
      setLookup({
        status: "error",
        message:
          "Could not reach the lookup API. Check the network and try a demo barcode.",
      });
    }
  }

  function stopCamera() {
    if (detectTimer.current) {
      window.clearInterval(detectTimer.current);
      detectTimer.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  async function startCamera() {
    setCameraError(null);
    setSavedName(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera isn’t available in this browser. Enter a barcode manually.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      if (!window.BarcodeDetector) {
        setCameraError(
          "Live barcode detection isn’t supported here — point the camera for framing, then type the digits below.",
        );
        return;
      }

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      detectTimer.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue;
          if (value) {
            stopCamera();
            setBarcode(value);
            void lookupCode(value);
          }
        } catch {
          // Ignore intermittent detect errors while streaming.
        }
      }, 700);
    } catch {
      setCameraError(
        "Camera permission was denied or unavailable. Use manual entry instead.",
      );
      stopCamera();
    }
  }

  function addToLog() {
    if (lookup.status !== "ready") return;
    startTransition(() => {
      const servingsN = Math.max(0.25, Number.parseFloat(servings) || 1);
      const entry = productToEntry({
        name: lookup.product.name,
        brand: lookup.product.brand,
        barcode: lookup.product.barcode,
        servingLabel: lookup.product.servingLabel,
        servings: servingsN,
        perServing: lookup.product.perServing,
        meal,
        date: todayKey(),
      });
      const existing = loadEntries();
      saveEntries([entry, ...existing]);
      setSavedName(entry.name);
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 animate-rise">
        <p className="mb-2 text-[11px] uppercase tracking-[0.24em] text-primary">
          Food lookup
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Scan
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Look up a packaged food by barcode via Open Food Facts, with a local
          mock catalog when the network fails. Add hits straight to today’s
          nutrition log.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-sm sm:p-6 animate-rise stagger-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="barcode-input">Barcode</Label>
            <Input
              id="barcode-input"
              inputMode="numeric"
              placeholder="e.g. 3017620422003"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void lookupCode(barcode);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void lookupCode(barcode)}
              disabled={lookup.status === "loading"}
            >
              {lookup.status === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ScanBarcode className="size-4" />
              )}
              Look up
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => (cameraActive ? stopCamera() : void startCamera())}
            >
              <Camera className="size-4" />
              {cameraActive ? "Stop camera" : "Use camera"}
            </Button>
          </div>
        </div>

        {(cameraActive || cameraError) && (
          <div className="mt-4 space-y-2">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-black/40">
              <video
                ref={videoRef}
                className={cn(
                  "aspect-video w-full object-cover",
                  !cameraActive && "hidden",
                )}
                muted
                playsInline
              />
              {!cameraActive && cameraError && (
                <div className="flex aspect-video items-center justify-center px-4 text-center text-sm text-muted-foreground">
                  Camera idle
                </div>
              )}
            </div>
            {cameraError && (
              <p className="text-sm text-muted-foreground">{cameraError}</p>
            )}
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Demo barcodes (mock fallback)
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_BARCODES.map((code) => (
              <button
                key={code}
                type="button"
                className="rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:text-primary"
                onClick={() => {
                  setBarcode(code);
                  void lookupCode(code);
                }}
              >
                <span className="font-medium text-foreground">
                  {MOCK_CATALOG[code].name}
                </span>
                <span className="mt-0.5 block text-muted-foreground">{code}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {lookup.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade">
          <Loader2 className="size-4 animate-spin text-primary" />
          Looking up product…
        </div>
      )}

      {lookup.status === "error" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive animate-rise">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{lookup.message}</p>
          </div>
        </div>
      )}

      {lookup.status === "ready" && (
        <section className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-sm sm:p-6 animate-rise">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {lookup.product.name}
              </h2>
              {lookup.product.brand && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {lookup.product.brand}
                </p>
              )}
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                via {lookup.via === "mock" ? "mock catalog" : "Open Food Facts"} ·{" "}
                {lookup.product.barcode}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Macro
              label="Calories"
              value={`${lookup.product.perServing.calories}`}
              unit="kcal"
            />
            <Macro
              label="Protein"
              value={`${lookup.product.perServing.proteinG}`}
              unit="g"
            />
            <Macro
              label="Carbs"
              value={`${lookup.product.perServing.carbsG}`}
              unit="g"
            />
            <Macro
              label="Fat"
              value={`${lookup.product.perServing.fatG}`}
              unit="g"
            />
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            Serving: {lookup.product.servingLabel}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {MEAL_ORDER.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMeal(item)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  meal === item
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {MEAL_LABELS[item]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex max-w-xs flex-col gap-2">
            <Label htmlFor="scan-servings">Servings</Label>
            <Input
              id="scan-servings"
              inputMode="decimal"
              value={servings}
              onChange={(event) => setServings(event.target.value)}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={addToLog} disabled={isPending}>
              {isPending ? "Adding…" : "Add to today’s nutrition log"}
            </Button>
            <Button variant="outline" render={<Link href="/nutrition" />}>
              Open nutrition
            </Button>
          </div>

          {savedName && (
            <p className="mt-4 flex items-center gap-2 text-sm text-primary">
              <Check className="size-4" />
              Added {savedName} to today’s log.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Macro({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-display text-lg font-semibold">
        {value}
        <span className="ml-1 text-xs font-sans font-normal text-muted-foreground">
          {unit}
        </span>
      </dd>
    </div>
  );
}
