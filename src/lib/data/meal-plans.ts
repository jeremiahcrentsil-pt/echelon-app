export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type PlannedMeal = {
  id: string;
  slot: MealSlot;
  name: string;
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes?: string;
};

export type PlanDay = {
  dayIndex: number; // 0 = Monday
  label: string;
  focus?: string;
  meals: PlannedMeal[];
};

export type MealPlan = {
  id: string;
  title: string;
  coachNote: string;
  calorieTarget: number;
  proteinTargetG: number;
  assignedAt: string;
  days: PlanDay[];
};

export type MealCompletion = {
  mealId: string;
  dateKey: string; // YYYY-MM-DD when marked
  eaten: boolean;
  adherenceNote?: string;
  updatedAt: string;
};

export type MealPlanStore = {
  plans: MealPlan[];
  completions: MealCompletion[];
};

const STORAGE_KEY = "echelon.mealplans.v1";

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Map JS getDay() (0=Sun) to plan dayIndex (0=Mon). */
export function planDayIndexForDate(date = new Date()) {
  const js = date.getDay();
  return js === 0 ? 6 : js - 1;
}

function meal(
  id: string,
  slot: MealSlot,
  name: string,
  description: string,
  calories: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  notes?: string,
): PlannedMeal {
  return { id, slot, name, description, calories, proteinG, carbsG, fatG, notes };
}

function seedPlan(): MealPlan {
  return {
    id: "plan-cut-a",
    title: "Cut phase · Plan A",
    coachNote:
      "Hit protein first. Swap like-for-like carbs if needed — keep the plate simple on training days.",
    calorieTarget: 2200,
    proteinTargetG: 180,
    assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    days: [
      {
        dayIndex: 0,
        label: "Monday",
        focus: "Lower body training",
        meals: [
          meal("m-mon-b", "breakfast", "Greek yogurt bowl", "Nonfat Greek yogurt, berries, 30 g oats", 380, 35, 42, 8),
          meal("m-mon-l", "lunch", "Chicken rice bowl", "6 oz chicken, 1 cup rice, veggies", 520, 48, 55, 10, "Add hot sauce freely"),
          meal("m-mon-s", "snack", "Whey + apple", "1 scoop whey, medium apple", 220, 25, 25, 2),
          meal("m-mon-d", "dinner", "Salmon & potatoes", "5 oz salmon, roasted potatoes, greens", 580, 42, 45, 22),
        ],
      },
      {
        dayIndex: 1,
        label: "Tuesday",
        focus: "Upper body training",
        meals: [
          meal("m-tue-b", "breakfast", "Egg scramble wrap", "3 eggs, spinach, wrap", 410, 28, 32, 18),
          meal("m-tue-l", "lunch", "Turkey sandwich plate", "Turkey, sourdough, side salad", 490, 40, 48, 14),
          meal("m-tue-s", "snack", "Cottage cheese cup", "1 cup low-fat cottage cheese", 180, 28, 8, 2),
          meal("m-tue-d", "dinner", "Lean beef stir-fry", "5 oz lean beef, rice noodles, veg", 560, 45, 50, 16),
        ],
      },
      {
        dayIndex: 2,
        label: "Wednesday",
        focus: "Active recovery",
        meals: [
          meal("m-wed-b", "breakfast", "Overnight oats", "Oats, protein milk, chia", 400, 30, 48, 10),
          meal("m-wed-l", "lunch", "Tuna potato bowl", "Tuna, baked potato, olive oil drizzle", 500, 42, 52, 12),
          meal("m-wed-s", "snack", "Protein shake", "Whey + banana", 250, 25, 30, 3),
          meal("m-wed-d", "dinner", "Chicken fajita plate", "Chicken, peppers, tortillas ×2", 540, 46, 48, 14),
        ],
      },
      {
        dayIndex: 3,
        label: "Thursday",
        focus: "Lower body training",
        meals: [
          meal("m-thu-b", "breakfast", "Protein pancakes", "2 pancakes, maple drizzle, berries", 420, 32, 48, 10),
          meal("m-thu-l", "lunch", "Chicken quinoa salad", "Chicken, quinoa, mixed greens", 510, 45, 44, 14),
          meal("m-thu-s", "snack", "Jerky + fruit", "Beef jerky, orange", 200, 22, 18, 4),
          meal("m-thu-d", "dinner", "White fish & rice", "Cod, jasmine rice, asparagus", 530, 48, 50, 10),
        ],
      },
      {
        dayIndex: 4,
        label: "Friday",
        focus: "Upper body training",
        meals: [
          meal("m-fri-b", "breakfast", "Yogurt parfait", "Greek yogurt, granola, honey", 390, 30, 45, 9),
          meal("m-fri-l", "lunch", "Burrito bowl", "Chicken, rice, beans, salsa", 560, 44, 62, 12),
          meal("m-fri-s", "snack", "Rice cakes + PB", "2 cakes, 1 tbsp peanut butter", 210, 8, 22, 10),
          meal("m-fri-d", "dinner", "Steak & veg", "5 oz sirloin, sweet potato, salad", 590, 46, 40, 24, "Restaurant OK if macros close"),
        ],
      },
      {
        dayIndex: 5,
        label: "Saturday",
        focus: "Flexible / social",
        meals: [
          meal("m-sat-b", "breakfast", "Eggs & toast", "2 eggs, sourdough, avocado smear", 430, 24, 34, 20),
          meal("m-sat-l", "lunch", "Chicken Caesar (light)", "Grilled chicken, light dressing", 480, 42, 28, 22),
          meal("m-sat-s", "snack", "Protein bar", "Any ~200 kcal bar", 200, 20, 22, 6),
          meal("m-sat-d", "dinner", "Flex dinner", "Eat out within ±150 kcal / hit protein", 600, 45, 50, 22, "Log in Nutrition if you want precision"),
        ],
      },
      {
        dayIndex: 6,
        label: "Sunday",
        focus: "Prep & rest",
        meals: [
          meal("m-sun-b", "breakfast", "Omelette plate", "3-egg omelette, fruit", 400, 28, 28, 18),
          meal("m-sun-l", "lunch", "Meal-prep chicken box", "Chicken, rice, broccoli", 520, 48, 52, 10),
          meal("m-sun-s", "snack", "Greek yogurt", "Plain yogurt + cinnamon", 160, 20, 10, 2),
          meal("m-sun-d", "dinner", "Turkey chili", "Turkey chili bowl, side salad", 540, 46, 42, 16),
        ],
      },
    ],
  };
}

export function seedStore(): MealPlanStore {
  return { plans: [seedPlan()], completions: [] };
}

export function loadStore(): MealPlanStore {
  if (!canUseStorage()) return seedStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedStore();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as MealPlanStore;
    if (!parsed || !Array.isArray(parsed.plans)) {
      throw new Error("Invalid meal plan store");
    }
    return {
      plans: parsed.plans,
      completions: Array.isArray(parsed.completions) ? parsed.completions : [],
    };
  } catch {
    throw new Error("Could not load meal plans from local storage");
  }
}

export function saveStore(store: MealPlanStore) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function dayTotals(day: PlanDay) {
  return day.meals.reduce(
    (acc, mealItem) => ({
      calories: acc.calories + mealItem.calories,
      proteinG: acc.proteinG + mealItem.proteinG,
      carbsG: acc.carbsG + mealItem.carbsG,
      fatG: acc.fatG + mealItem.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function getCompletion(
  completions: MealCompletion[],
  mealId: string,
  dateKey: string,
) {
  return (
    completions.find(
      (item) => item.mealId === mealId && item.dateKey === dateKey,
    ) ?? null
  );
}

export function upsertCompletion(
  completions: MealCompletion[],
  next: MealCompletion,
): MealCompletion[] {
  const without = completions.filter(
    (item) => !(item.mealId === next.mealId && item.dateKey === next.dateKey),
  );
  return [next, ...without];
}

export function formatAssignedAt(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function eatenCountForDay(
  day: PlanDay,
  completions: MealCompletion[],
  dateKey: string,
) {
  return day.meals.filter((mealItem) =>
    getCompletion(completions, mealItem.id, dateKey)?.eaten,
  ).length;
}
