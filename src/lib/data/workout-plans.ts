import { MOCK_CLIENTS } from "@/lib/data/clients";
import type { WorkoutDraft } from "@/lib/data/workouts";
import { createId as createWorkoutId } from "@/lib/data/workouts";

export type ProgramExercise = {
  id: string;
  name: string;
  /** Target working sets */
  targetSets: number;
  /** Target reps — e.g. "5", "8-10", "AMRAP" */
  targetReps: string;
  notes?: string;
};

export type ProgramDay = {
  id: string;
  title: string;
  dayLabel: string;
  exercises: ProgramExercise[];
};

export type ProgramWeek = {
  id: string;
  weekNumber: number;
  label: string;
  days: ProgramDay[];
};

/** @deprecated Legacy flat session shape — normalized into weeks on read */
export type PlannedExercise = {
  id: string;
  name: string;
  prescription: string;
  notes?: string;
};

/** @deprecated */
export type WorkoutSessionTemplate = {
  id: string;
  title: string;
  dayLabel: string;
  exercises: PlannedExercise[];
};

export type WorkoutPlanProgress = {
  currentWeekIndex: number;
  currentDayIndex: number;
  completedDayIds: string[];
};

export type WorkoutPlan = {
  id: string;
  title: string;
  coachNote: string;
  assignedClientIds: string[];
  assignedAt: string;
  weeks: ProgramWeek[];
  /** Present when loaded for a specific client (their assignment cursor) */
  progress?: WorkoutPlanProgress;
};

const STORAGE_KEY = "echelon.workoutplans.v2";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatExercisePrescription(exercise: ProgramExercise) {
  const sets = Math.max(1, exercise.targetSets || 1);
  const reps = exercise.targetReps.trim() || "—";
  return `${sets}×${reps}`;
}

/** Parse legacy "3×5 @ RPE 7" strings into structured fields */
export function parsePrescription(prescription: string): {
  targetSets: number;
  targetReps: string;
} {
  const match = prescription.trim().match(/^(\d+)\s*[x×]\s*(.+)$/i);
  if (match) {
    return {
      targetSets: Number.parseInt(match[1], 10) || 3,
      targetReps: match[2].trim(),
    };
  }
  return { targetSets: 3, targetReps: prescription.trim() || "8" };
}

function legacySessionsToWeeks(
  sessions: WorkoutSessionTemplate[],
): ProgramWeek[] {
  if (sessions.length === 0) return [];
  return [
    {
      id: "week-legacy-1",
      weekNumber: 1,
      label: "Week 1",
      days: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        dayLabel: session.dayLabel,
        exercises: session.exercises.map((exercise) => {
          const parsed = parsePrescription(exercise.prescription);
          return {
            id: exercise.id,
            name: exercise.name,
            targetSets: parsed.targetSets,
            targetReps: parsed.targetReps,
            notes: exercise.notes,
          };
        }),
      })),
    },
  ];
}

type RawPlan = {
  id: string;
  title: string;
  coachNote: string;
  assignedClientIds?: string[];
  assignedAt: string;
  weeks?: ProgramWeek[];
  sessions?: WorkoutSessionTemplate[];
  progress?: WorkoutPlanProgress;
};

/** Normalize DB/API payloads (weeks or legacy sessions) into WorkoutPlan */
export function normalizeWorkoutPlan(raw: RawPlan): WorkoutPlan {
  const weeks =
    Array.isArray(raw.weeks) && raw.weeks.length > 0
      ? raw.weeks.map((week, index) => ({
          id: week.id || createId("wk"),
          weekNumber: week.weekNumber || index + 1,
          label: week.label || `Week ${week.weekNumber || index + 1}`,
          days: (week.days ?? []).map((day) => ({
            id: day.id || createId("day"),
            title: day.title || "Session",
            dayLabel: day.dayLabel || "Day",
            exercises: (day.exercises ?? []).map((exercise) => {
              if (
                "targetSets" in exercise &&
                typeof (exercise as ProgramExercise).targetSets === "number"
              ) {
                const structured = exercise as ProgramExercise;
                return {
                  id: structured.id || createId("ex"),
                  name: structured.name,
                  targetSets: Math.max(1, structured.targetSets || 1),
                  targetReps: structured.targetReps || "8",
                  notes: structured.notes,
                };
              }
              const legacy = exercise as unknown as PlannedExercise;
              const parsed = parsePrescription(legacy.prescription ?? "3×8");
              return {
                id: legacy.id || createId("ex"),
                name: legacy.name,
                targetSets: parsed.targetSets,
                targetReps: parsed.targetReps,
                notes: legacy.notes,
              };
            }),
          })),
        }))
      : legacySessionsToWeeks(raw.sessions ?? []);

  return {
    id: raw.id,
    title: raw.title,
    coachNote: raw.coachNote ?? "",
    assignedClientIds: raw.assignedClientIds ?? [],
    assignedAt: raw.assignedAt,
    weeks,
    progress: raw.progress,
  };
}

export function flattenProgramDays(plan: WorkoutPlan): Array<{
  week: ProgramWeek;
  weekIndex: number;
  day: ProgramDay;
  dayIndex: number;
}> {
  const out: Array<{
    week: ProgramWeek;
    weekIndex: number;
    day: ProgramDay;
    dayIndex: number;
  }> = [];
  plan.weeks.forEach((week, weekIndex) => {
    week.days.forEach((day, dayIndex) => {
      out.push({ week, weekIndex, day, dayIndex });
    });
  });
  return out;
}

export function getAssignedDay(
  plan: WorkoutPlan,
  progress?: WorkoutPlanProgress,
): {
  week: ProgramWeek;
  day: ProgramDay;
  weekIndex: number;
  dayIndex: number;
} | null {
  const cursor = progress ?? plan.progress ?? {
    currentWeekIndex: 0,
    currentDayIndex: 0,
    completedDayIds: [],
  };
  const week = plan.weeks[cursor.currentWeekIndex];
  if (!week) return null;
  const day = week.days[cursor.currentDayIndex];
  if (!day) return null;
  return {
    week,
    day,
    weekIndex: cursor.currentWeekIndex,
    dayIndex: cursor.currentDayIndex,
  };
}

/** Advance cursor to the next day after completing `completedDayId` */
export function advanceProgress(
  plan: WorkoutPlan,
  current: WorkoutPlanProgress,
  completedDayId: string,
): WorkoutPlanProgress {
  const completedDayIds = current.completedDayIds.includes(completedDayId)
    ? current.completedDayIds
    : [...current.completedDayIds, completedDayId];

  const flat = flattenProgramDays(plan);
  const currentIdx = flat.findIndex(
    (item) =>
      item.weekIndex === current.currentWeekIndex &&
      item.dayIndex === current.currentDayIndex,
  );
  const next = flat[currentIdx + 1];
  if (!next) {
    return {
      currentWeekIndex: current.currentWeekIndex,
      currentDayIndex: current.currentDayIndex,
      completedDayIds,
    };
  }
  return {
    currentWeekIndex: next.weekIndex,
    currentDayIndex: next.dayIndex,
    completedDayIds,
  };
}

/** Prefill free-log draft from a programmed day */
export function programDayToDraft(
  plan: WorkoutPlan,
  day: ProgramDay,
): WorkoutDraft {
  return {
    title: day.title,
    notes: plan.coachNote ? `Program: ${plan.title}` : "",
    durationMinutes: "",
    exercises:
      day.exercises.length > 0
        ? day.exercises.map((exercise) => ({
            id: createWorkoutId("ex"),
            name: exercise.name,
            notes: exercise.notes ?? "",
            sets: Array.from(
              { length: Math.max(1, exercise.targetSets) },
              () => ({
                id: createWorkoutId("set"),
                reps: exercise.targetReps.replace(/[^\d].*$/, "") || "",
                weightLbs: "",
              }),
            ),
          }))
        : [
            {
              id: createWorkoutId("ex"),
              name: "",
              notes: "",
              sets: [{ id: createWorkoutId("set"), reps: "", weightLbs: "" }],
            },
          ],
  };
}

function seedPlans(): WorkoutPlan[] {
  return [
    normalizeWorkoutPlan({
      id: "wp-strength-a",
      title: "Strength block · 2 weeks",
      coachNote: "Log working sets honestly. Warm up to the first listed load.",
      assignedClientIds: [MOCK_CLIENTS[0].id],
      assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      weeks: [
        {
          id: "wk-1",
          weekNumber: 1,
          label: "Week 1",
          days: [
            {
              id: "day-w1-lower",
              title: "Lower strength A",
              dayLabel: "Day 1",
              exercises: [
                {
                  id: "ex-bs",
                  name: "Back squat",
                  targetSets: 3,
                  targetReps: "5 @ RPE 7",
                  notes: "Pause first rep",
                },
                {
                  id: "ex-rdl",
                  name: "Romanian deadlift",
                  targetSets: 3,
                  targetReps: "8",
                },
                {
                  id: "ex-lunge",
                  name: "Walking lunge",
                  targetSets: 2,
                  targetReps: "10/leg",
                },
              ],
            },
            {
              id: "day-w1-upper",
              title: "Upper push / pull",
              dayLabel: "Day 2",
              exercises: [
                {
                  id: "ex-bench",
                  name: "Bench press",
                  targetSets: 3,
                  targetReps: "6",
                },
                {
                  id: "ex-row",
                  name: "Chest-supported row",
                  targetSets: 3,
                  targetReps: "10",
                },
                {
                  id: "ex-fp",
                  name: "Cable face pull",
                  targetSets: 3,
                  targetReps: "15",
                },
              ],
            },
          ],
        },
        {
          id: "wk-2",
          weekNumber: 2,
          label: "Week 2",
          days: [
            {
              id: "day-w2-lower",
              title: "Lower strength A",
              dayLabel: "Day 1",
              exercises: [
                {
                  id: "ex-bs-2",
                  name: "Back squat",
                  targetSets: 4,
                  targetReps: "5 @ RPE 8",
                  notes: "Add a working set",
                },
                {
                  id: "ex-rdl-2",
                  name: "Romanian deadlift",
                  targetSets: 3,
                  targetReps: "8",
                },
                {
                  id: "ex-lunge-2",
                  name: "Walking lunge",
                  targetSets: 3,
                  targetReps: "10/leg",
                },
              ],
            },
            {
              id: "day-w2-upper",
              title: "Upper push / pull",
              dayLabel: "Day 2",
              exercises: [
                {
                  id: "ex-bench-2",
                  name: "Bench press",
                  targetSets: 4,
                  targetReps: "5",
                },
                {
                  id: "ex-row-2",
                  name: "Chest-supported row",
                  targetSets: 3,
                  targetReps: "10",
                },
                {
                  id: "ex-fp-2",
                  name: "Cable face pull",
                  targetSets: 3,
                  targetReps: "15",
                },
              ],
            },
          ],
        },
      ],
    }),
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
    const parsed = JSON.parse(raw) as RawPlan[];
    if (!Array.isArray(parsed)) throw new Error("Invalid workout plan store");
    return parsed.map(normalizeWorkoutPlan);
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

export function emptyProgramExercise(): ProgramExercise {
  return {
    id: createId("ex"),
    name: "",
    targetSets: 3,
    targetReps: "8",
  };
}

export function emptyProgramDay(dayNumber = 1): ProgramDay {
  return {
    id: createId("day"),
    title: `Session ${dayNumber}`,
    dayLabel: `Day ${dayNumber}`,
    exercises: [emptyProgramExercise()],
  };
}

export function emptyProgramWeek(weekNumber = 1): ProgramWeek {
  return {
    id: createId("wk"),
    weekNumber,
    label: `Week ${weekNumber}`,
    days: [emptyProgramDay(1)],
  };
}

export function emptyWorkoutPlanDraft(): Omit<WorkoutPlan, "id" | "assignedAt"> {
  return {
    title: "",
    coachNote: "",
    assignedClientIds: [MOCK_CLIENTS[0].id],
    weeks: [emptyProgramWeek(1)],
  };
}
