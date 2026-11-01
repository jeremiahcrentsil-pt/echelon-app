export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodMacros = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type FoodEntry = {
  id: string;
  date: string; // YYYY-MM-DD local
  meal: MealType;
  name: string;
  brand?: string;
  barcode?: string;
  servingLabel: string;
  servings: number;
  macros: FoodMacros;
  source: "manual" | "barcode" | "seed";
  loggedAt: string;
};

export type FoodEntryDraft = {
  meal: MealType;
  name: string;
  brand: string;
  servingLabel: string;
  servings: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
};

const STORAGE_KEY = "echelon.nutrition.v1";

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const MEAL_ORDER: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

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

export function emptyDraft(meal: MealType = "breakfast"): FoodEntryDraft {
  return {
    meal,
    name: "",
    brand: "",
    servingLabel: "1 serving",
    servings: "1",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  };
}

function seedEntries(): FoodEntry[] {
  const date = todayKey();
  return [
    {
      id: "n-seed-1",
      date,
      meal: "breakfast",
      name: "Greek yogurt",
      brand: "Fage",
      servingLabel: "170 g",
      servings: 1,
      macros: { calories: 150, proteinG: 20, carbsG: 6, fatG: 4 },
      source: "seed",
      loggedAt: new Date().toISOString(),
    },
    {
      id: "n-seed-2",
      date,
      meal: "lunch",
      name: "Chicken breast",
      servingLabel: "6 oz cooked",
      servings: 1,
      macros: { calories: 280, proteinG: 52, carbsG: 0, fatG: 6 },
      source: "seed",
      loggedAt: new Date().toISOString(),
    },
  ];
}

export function loadEntries(): FoodEntry[] {
  if (!canUseStorage()) return seedEntries();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedEntries();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as FoodEntry[];
    if (!Array.isArray(parsed)) throw new Error("Invalid nutrition store");
    return parsed;
  } catch {
    throw new Error("Could not load nutrition log from local storage");
  }
}

export function saveEntries(entries: FoodEntry[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function draftToEntry(draft: FoodEntryDraft, date = todayKey()): FoodEntry {
  const servings = Math.max(0.25, Number.parseFloat(draft.servings) || 1);
  const scale = (value: string, integer = false) => {
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return 0;
    const total = n * servings;
    return integer ? Math.round(total) : Math.round(total * 10) / 10;
  };

  return {
    id: createId("n"),
    date,
    meal: draft.meal,
    name: draft.name.trim() || "Untitled food",
    brand: draft.brand.trim() || undefined,
    servingLabel: draft.servingLabel.trim() || "1 serving",
    servings,
    macros: {
      calories: scale(draft.calories, true),
      proteinG: scale(draft.proteinG),
      carbsG: scale(draft.carbsG),
      fatG: scale(draft.fatG),
    },
    source: "manual",
    loggedAt: new Date().toISOString(),
  };
}

/** Build an entry from a looked-up food product (per-serving macros × servings). */
export function productToEntry(input: {
  name: string;
  brand?: string;
  barcode?: string;
  servingLabel: string;
  servings: number;
  perServing: FoodMacros;
  meal: MealType;
  date?: string;
}): FoodEntry {
  const servings = Math.max(0.25, input.servings);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    id: createId("n"),
    date: input.date ?? todayKey(),
    meal: input.meal,
    name: input.name,
    brand: input.brand,
    barcode: input.barcode,
    servingLabel: input.servingLabel,
    servings,
    macros: {
      calories: Math.round(input.perServing.calories * servings),
      proteinG: round1(input.perServing.proteinG * servings),
      carbsG: round1(input.perServing.carbsG * servings),
      fatG: round1(input.perServing.fatG * servings),
    },
    source: "barcode",
    loggedAt: new Date().toISOString(),
  };
}

export function entriesForDate(entries: FoodEntry[], date: string) {
  return entries.filter((entry) => entry.date === date);
}

export function sumMacros(entries: FoodEntry[]): FoodMacros {
  return entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.macros.calories,
      proteinG: acc.proteinG + entry.macros.proteinG,
      carbsG: acc.carbsG + entry.macros.carbsG,
      fatG: acc.fatG + entry.macros.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function formatMacro(n: number, unit = "") {
  const rounded = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${rounded}${unit}`;
}

export function formatDayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = todayKey();
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return dateKey === today ? `Today · ${label}` : label;
}
