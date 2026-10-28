export type MonitoringEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  steps: number;
  waterLiters: number;
  readiness: number; // 1-5
  mood: number; // 1-5
  sleepQuality: number; // 1-5
  notes?: string;
  loggedAt: string;
};

export type MonitoringDraft = {
  steps: string;
  waterLiters: string;
  readiness: string;
  mood: string;
  sleepQuality: string;
  notes: string;
};

const STORAGE_KEY = "echelon.monitoring.v1";

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

export function emptyDraft(): MonitoringDraft {
  return {
    steps: "",
    waterLiters: "",
    readiness: "3",
    mood: "3",
    sleepQuality: "3",
    notes: "",
  };
}

export function entryToDraft(entry: MonitoringEntry): MonitoringDraft {
  return {
    steps: String(entry.steps),
    waterLiters: String(entry.waterLiters),
    readiness: String(entry.readiness),
    mood: String(entry.mood),
    sleepQuality: String(entry.sleepQuality),
    notes: entry.notes ?? "",
  };
}

function seedHistory(): MonitoringEntry[] {
  const today = new Date();
  const days: MonitoringEntry[] = [];
  for (let i = 1; i <= 3; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      id: `m-seed-${i}`,
      date: todayKey(d),
      steps: 7200 + i * 400,
      waterLiters: 2.2 + i * 0.1,
      readiness: 3 + (i % 2),
      mood: 3 + ((i + 1) % 2),
      sleepQuality: 4 - (i % 2),
      notes: i === 1 ? "Solid day overall." : undefined,
      loggedAt: d.toISOString(),
    });
  }
  return days;
}

export function loadEntries(): MonitoringEntry[] {
  if (!canUseStorage()) return seedHistory();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedHistory();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as MonitoringEntry[];
    if (!Array.isArray(parsed)) throw new Error("Invalid monitoring store");
    return parsed;
  } catch {
    throw new Error("Could not load monitoring from local storage");
  }
}

export function saveEntries(entries: MonitoringEntry[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function draftToEntry(
  draft: MonitoringDraft,
  date = todayKey(),
  existingId?: string,
): MonitoringEntry {
  return {
    id: existingId ?? createId("m"),
    date,
    steps: Math.max(0, Math.round(Number.parseFloat(draft.steps) || 0)),
    waterLiters: Math.max(0, Math.round((Number.parseFloat(draft.waterLiters) || 0) * 10) / 10),
    readiness: clampScale(draft.readiness),
    mood: clampScale(draft.mood),
    sleepQuality: clampScale(draft.sleepQuality),
    notes: draft.notes.trim() || undefined,
    loggedAt: new Date().toISOString(),
  };
}

function clampScale(value: string) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, n));
}

export function entryForDate(entries: MonitoringEntry[], date: string) {
  return entries.find((entry) => entry.date === date) ?? null;
}

export function recentEntries(entries: MonitoringEntry[], limit = 7) {
  return [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function formatDayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return dateKey === todayKey() ? `Today · ${label}` : label;
}

export const SCALE_LABELS = ["", "Low", "Fair", "OK", "Good", "High"] as const;
