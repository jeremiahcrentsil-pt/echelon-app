export type PhotoPose = "front" | "side" | "back";

export type ProgressPhoto = {
  id: string;
  date: string; // YYYY-MM-DD
  pose: PhotoPose;
  note?: string;
  /** Compressed JPEG data URL */
  dataUrl: string;
  width: number;
  height: number;
  bytesApprox: number;
  createdAt: string;
};

const STORAGE_KEY = "echelon.progressphotos.v1";
export const MAX_PHOTOS = 24;
export const MAX_EDGE_PX = 720;
export const JPEG_QUALITY = 0.72;
/** Soft cap so localStorage stays usable across browsers (~4.5MB of photo payload). */
export const MAX_STORE_BYTES = 4_500_000;

export const POSE_LABELS: Record<PhotoPose, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
};

export const POSES: PhotoPose[] = ["front", "side", "back"];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function estimateStoreBytes(photos: ProgressPhoto[]) {
  return photos.reduce((sum, photo) => sum + photo.bytesApprox, 0);
}

export function loadPhotos(): ProgressPhoto[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProgressPhoto[];
    if (!Array.isArray(parsed)) throw new Error("Invalid progress photo store");
    return parsed;
  } catch {
    throw new Error("Could not load progress photos from local storage");
  }
}

export function savePhotos(photos: ProgressPhoto[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
}

export function formatPhotoDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export function groupByDate(photos: ProgressPhoto[]) {
  const map = new Map<string, ProgressPhoto[]>();
  for (const photo of [...photos].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))) {
    const list = map.get(photo.date) ?? [];
    list.push(photo);
    map.set(photo.date, list);
  }
  return [...map.entries()];
}

export type CompressResult = {
  dataUrl: string;
  width: number;
  height: number;
  bytesApprox: number;
};

/** Resize + JPEG-compress a File/Blob for localStorage-friendly storage. */
export async function compressImageFile(
  file: File,
  maxEdge = MAX_EDGE_PX,
  quality = JPEG_QUALITY,
): Promise<CompressResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file (JPEG, PNG, or HEIC converted by the browser).");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process that image in this browser.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const bytesApprox = Math.round((dataUrl.length * 3) / 4);
  if (bytesApprox > 550_000) {
    throw new Error("Image is still too large after compression. Try a smaller photo.");
  }
  return { dataUrl, width, height, bytesApprox };
}

/** Tiny seeded demo frames so the tracker isn’t empty on first open. */
export function createSeedPhotos(): ProgressPhoto[] {
  const older = new Date();
  older.setDate(older.getDate() - 14);
  const mid = new Date();
  mid.setDate(mid.getDate() - 7);

  return [
    makeSeedPhoto("seed-front-old", todayKey(older), "front", "#1a3a3a", "#3ecfbe", "Week −2"),
    makeSeedPhoto("seed-side-old", todayKey(older), "side", "#1a2a3a", "#7ec8e3", "Week −2"),
    makeSeedPhoto("seed-front-mid", todayKey(mid), "front", "#1f3330", "#5ee0c8", "Week −1"),
  ];
}

function makeSeedPhoto(
  id: string,
  date: string,
  pose: PhotoPose,
  bg: string,
  accent: string,
  label: string,
): ProgressPhoto {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      id,
      date,
      pose,
      note: label,
      dataUrl:
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      width: 1,
      height: 1,
      bytesApprox: 50,
      createdAt: new Date(`${date}T12:00:00`).toISOString(),
    };
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 360, 480);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(180, 200, 70, 120, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#e8f7f4";
  ctx.font = "600 22px sans-serif";
  ctx.fillText(POSE_LABELS[pose], 24, 40);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#9bb8b2";
  ctx.fillText(label, 24, 64);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
  return {
    id,
    date,
    pose,
    note: `${label} seed frame`,
    dataUrl,
    width: 360,
    height: 480,
    bytesApprox: Math.round((dataUrl.length * 3) / 4),
    createdAt: new Date(`${date}T12:00:00`).toISOString(),
  };
}

export function ensureSeededPhotos(): ProgressPhoto[] {
  const existing = loadPhotos();
  if (existing.length > 0) return existing;
  const seeded = createSeedPhotos();
  savePhotos(seeded);
  return seeded;
}
