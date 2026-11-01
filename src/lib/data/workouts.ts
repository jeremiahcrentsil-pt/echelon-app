export type WorkoutSet = {
  id: string;
  reps: number;
  weightLbs?: number;
  completed: boolean;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[];
  notes?: string;
};

export type Workout = {
  id: string;
  title: string;
  performedAt: string;
  durationMinutes?: number;
  notes?: string;
  exercises: WorkoutExercise[];
};

export type WorkoutDraft = {
  title: string;
  notes: string;
  durationMinutes: string;
  exercises: Array<{
    id: string;
    name: string;
    notes: string;
    sets: Array<{
      id: string;
      reps: string;
      weightLbs: string;
    }>;
  }>;
};

const STORAGE_KEY = "echelon.workouts.v1";

export const SEED_WORKOUTS: Workout[] = [
  {
    id: "w-seed-1",
    title: "Lower strength A",
    performedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    durationMinutes: 58,
    notes: "Felt strong on hinge; keep depth honest on squats.",
    exercises: [
      {
        id: "e1",
        name: "Back squat",
        notes: "Paused first rep each set",
        sets: [
          { id: "s1", reps: 5, weightLbs: 185, completed: true },
          { id: "s2", reps: 5, weightLbs: 205, completed: true },
          { id: "s3", reps: 5, weightLbs: 215, completed: true },
        ],
      },
      {
        id: "e2",
        name: "Romanian deadlift",
        sets: [
          { id: "s4", reps: 8, weightLbs: 185, completed: true },
          { id: "s5", reps: 8, weightLbs: 185, completed: true },
          { id: "s6", reps: 8, weightLbs: 195, completed: true },
        ],
      },
      {
        id: "e3",
        name: "Walking lunge",
        sets: [
          { id: "s7", reps: 10, weightLbs: 40, completed: true },
          { id: "s8", reps: 10, weightLbs: 40, completed: true },
        ],
      },
    ],
  },
  {
    id: "w-seed-2",
    title: "Upper push / pull",
    performedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    durationMinutes: 49,
    exercises: [
      {
        id: "e4",
        name: "Bench press",
        sets: [
          { id: "s9", reps: 6, weightLbs: 155, completed: true },
          { id: "s10", reps: 6, weightLbs: 165, completed: true },
          { id: "s11", reps: 5, weightLbs: 175, completed: true },
        ],
      },
      {
        id: "e5",
        name: "Chest-supported row",
        sets: [
          { id: "s12", reps: 10, weightLbs: 70, completed: true },
          { id: "s13", reps: 10, weightLbs: 70, completed: true },
          { id: "s14", reps: 10, weightLbs: 75, completed: true },
        ],
      },
    ],
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadWorkouts(): Workout[] {
  if (!canUseStorage()) return SEED_WORKOUTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_WORKOUTS));
      return SEED_WORKOUTS;
    }
    const parsed = JSON.parse(raw) as Workout[];
    if (!Array.isArray(parsed)) throw new Error("Invalid workout store");
    return parsed;
  } catch {
    throw new Error("Could not load workouts from local storage");
  }
}

export function saveWorkouts(workouts: Workout[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyDraft(): WorkoutDraft {
  // Stable ids for the initial client render; createId is used when adding rows.
  return {
    title: "",
    notes: "",
    durationMinutes: "",
    exercises: [
      {
        id: "ex-draft-0",
        name: "",
        notes: "",
        sets: [{ id: "set-draft-0", reps: "", weightLbs: "" }],
      },
    ],
  };
}

export function draftToWorkout(draft: WorkoutDraft): Workout {
  const title = draft.title.trim() || "Untitled session";
  const duration = Number.parseInt(draft.durationMinutes, 10);

  return {
    id: createId("w"),
    title,
    performedAt: new Date().toISOString(),
    durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    notes: draft.notes.trim() || undefined,
    exercises: draft.exercises
      .filter((exercise) => exercise.name.trim().length > 0)
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name.trim(),
        notes: exercise.notes.trim() || undefined,
        sets: exercise.sets
          .map((set) => ({
            id: set.id,
            reps: Number.parseInt(set.reps, 10) || 0,
            weightLbs: set.weightLbs.trim()
              ? Number.parseFloat(set.weightLbs)
              : undefined,
            completed: true,
          }))
          .filter((set) => set.reps > 0),
      }))
      .filter((exercise) => exercise.sets.length > 0),
  };
}

export function formatWorkoutDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function workoutSummary(workout: Workout) {
  const sets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  return `${workout.exercises.length} exercise${workout.exercises.length === 1 ? "" : "s"} · ${sets} set${sets === 1 ? "" : "s"}`;
}
