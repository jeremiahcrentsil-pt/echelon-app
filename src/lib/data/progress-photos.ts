export type PhotoPose = "front" | "side" | "back";

export type ProgressPhoto = {
  id: string;
  date: string; // YYYY-MM-DD
  pose: PhotoPose;
  note?: string;
  /** Display URL (CDN / S3 public URL or authenticated API proxy) */
  url: string;
  objectKey?: string;
  width: number;
  height: number;
  bytesApprox: number;
  createdAt: string;
};

/** Upload payload still carries a compressed data URL; server stores the bytes in object storage. */
export type ProgressPhotoUpload = Omit<ProgressPhoto, "url" | "objectKey"> & {
  dataUrl: string;
};

const STORAGE_KEY = "echelon.progressphotos.v2";
export const MAX_PHOTOS = 48;
export const MAX_EDGE_PX = 720;
export const JPEG_QUALITY = 0.72;
/** Soft per-user budget once binaries live in object storage (not the DB). */
export const MAX_STORE_BYTES = 40_000_000;

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
  for (const photo of [...photos].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )) {
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

/** Resize + JPEG-compress a File/Blob before upload to object storage. */
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
  if (bytesApprox > 900_000) {
    throw new Error("Image is still too large after compression. Try a smaller photo.");
  }
  return { dataUrl, width, height, bytesApprox };
}
