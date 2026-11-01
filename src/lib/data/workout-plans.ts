import { MOCK_CLIENTS } from "@/lib/data/clients";

export type PlannedExercise = {
  id: string;
  name: string;
  prescription: string;
  notes?: string;
};

export type WorkoutSessionTemplate = {
  id: string;
  title: string;
  dayLabel: string;
  exercises: PlannedExercise[];
};

export type WorkoutPlan = {
  id: string;
  title: string;
  coachNote: string;
  assignedClientIds: string[];
  assignedAt: string;
  sessions: WorkoutSessionTemplate[];
};

const STORAGE_KEY = "echelon.workoutplans.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function seedPlans(): WorkoutPlan[] {
  return [
    {
      id: "wp-strength-a",
      title: "Strength block · Week template",
      coachNote: "Log working sets honestly. Warm up to the first listed load.",
      assignedClientIds: [MOCK_CLIENTS[0].id],
      assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      sessions: [
        {
          id: "ws-lower-a",
          title: "Lower strength A",
          dayLabel: "Day 1",
          exercises: [
            {
              id: "we-1",
              name: "Back squat",
              prescription: "3×5 @ RPE 7",
              notes: "Pause first rep",
            },
            {
              id: "we-2",
              name: "Romanian deadlift",
              prescription: "3×8",
            },
            {
              id: "we-3",
              name: "Walking lunge",
              prescription: "2×10/leg",
            },
          ],
        },
        {
          id: "ws-upper-a",
          title: "Upper push / pull",
          dayLabel: "Day 2",
          exercises: [
            {
              id: "we-4",
              name: "Bench press",
              prescription: "3×6",
            },
            {
              id: "we-5",
              name: "Chest-supported row",
              prescription: "3×10",
            },
            {
              id: "we-6",
              name: "Cable face pull",
              prescription: "3×15",
            },
          ],
        },
      ],
    },
  ];
}

export function loadWorkoutPlans(): WorkoutPlan[] {
  if (!canUseStorage()) return seedPlans();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedPlans();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as WorkoutPlan[];
    if (!Array.isArray(parsed)) throw new Error("Invalid workout plan store");
    return parsed;
  } catch {
    throw new Error("Could not load workout plans");
  }
}

export function saveWorkoutPlans(plans: WorkoutPlan[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function plansForClient(plans: WorkoutPlan[], clientId: string) {
  return plans.filter((plan) => plan.assignedClientIds.includes(clientId));
}

export function emptyWorkoutPlanDraft(): Omit<WorkoutPlan, "id" | "assignedAt"> {
  return {
    title: "",
    coachNote: "",
    assignedClientIds: [MOCK_CLIENTS[0].id],
    sessions: [
      {
        id: "ws-draft-0",
        title: "Session 1",
        dayLabel: "Day 1",
        exercises: [
          {
            id: "we-draft-0",
            name: "",
            prescription: "3×8",
          },
        ],
      },
    ],
  };
}
