import { NextRequest, NextResponse } from "next/server";

import { requireSession, resolveClientId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  advanceProgress,
  normalizeWorkoutPlan,
  type ProgramWeek,
  type WorkoutPlanProgress,
  type WorkoutSessionTemplate,
} from "@/lib/data/workout-plans";
import type { Workout, WorkoutExercise } from "@/lib/data/workouts";
import { fromJson, toJson } from "@/lib/json";

function mapWorkout(row: {
  id: string;
  title: string;
  performedAt: Date;
  durationMinutes: number | null;
  notes: string | null;
  exercises: string;
  programId: string | null;
  programDayId: string | null;
}): Workout {
  return {
    id: row.id,
    title: row.title,
    performedAt: row.performedAt.toISOString(),
    durationMinutes: row.durationMinutes ?? undefined,
    notes: row.notes ?? undefined,
    exercises: fromJson<WorkoutExercise[]>(row.exercises, []),
    programId: row.programId ?? undefined,
    programDayId: row.programDayId ?? undefined,
  };
}

async function advanceProgramIfNeeded(
  userId: string,
  programId: string | undefined,
  programDayId: string | undefined,
) {
  if (!programId || !programDayId) return;

  const planRow = await prisma.workoutPlan.findUnique({
    where: { id: programId },
    include: { assignments: true },
  });
  if (!planRow) return;

  const assignment = planRow.assignments.find((row) => row.userId === userId);
  if (!assignment) return;

  const rawWeeks = fromJson<ProgramWeek[] | WorkoutSessionTemplate[]>(
    planRow.weeks,
    [],
  );
  const looksLikeLegacy =
    Array.isArray(rawWeeks) &&
    rawWeeks.length > 0 &&
    rawWeeks[0] != null &&
    "exercises" in rawWeeks[0] &&
    !("days" in rawWeeks[0]);

  const plan = normalizeWorkoutPlan({
    id: planRow.id,
    title: planRow.title,
    coachNote: planRow.coachNote,
    assignedAt: planRow.assignedAt.toISOString(),
    assignedClientIds: planRow.assignments.map((a) => a.userId),
    weeks: looksLikeLegacy ? undefined : (rawWeeks as ProgramWeek[]),
    sessions: looksLikeLegacy
      ? (rawWeeks as WorkoutSessionTemplate[])
      : undefined,
  });

  const current: WorkoutPlanProgress = {
    currentWeekIndex: assignment.currentWeekIndex,
    currentDayIndex: assignment.currentDayIndex,
    completedDayIds: fromJson<string[]>(assignment.completedDayIds, []),
  };

  const next = advanceProgress(plan, current, programDayId);
  await prisma.workoutPlanAssignment.update({
    where: {
      planId_userId: { planId: programId, userId },
    },
    data: {
      currentWeekIndex: next.currentWeekIndex,
      currentDayIndex: next.currentDayIndex,
      completedDayIds: toJson(next.completedDayIds),
    },
  });
}

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const requested = req.nextUrl.searchParams.get("clientId");
  const resolved = resolveClientId(result.user, requested);
  if ("error" in resolved) return resolved.error;

  const rows = await prisma.workout.findMany({
    where: { userId: resolved.clientId },
    orderBy: { performedAt: "desc" },
  });

  return NextResponse.json({ workouts: rows.map(mapWorkout) });
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    clientId?: string;
    workout: Workout;
  };

  const resolved = resolveClientId(result.user, body.clientId);
  if ("error" in resolved) return resolved.error;

  if (result.user.role === "client" && resolved.clientId !== result.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workout = body.workout;
  if (!workout?.title || !Array.isArray(workout.exercises)) {
    return NextResponse.json({ error: "Invalid workout" }, { status: 400 });
  }

  const created = await prisma.workout.create({
    data: {
      id: workout.id,
      userId: resolved.clientId,
      title: workout.title,
      performedAt: new Date(workout.performedAt || Date.now()),
      durationMinutes: workout.durationMinutes ?? null,
      notes: workout.notes ?? null,
      exercises: toJson(workout.exercises),
      programId: workout.programId ?? null,
      programDayId: workout.programDayId ?? null,
    },
  });

  await advanceProgramIfNeeded(
    resolved.clientId,
    workout.programId,
    workout.programDayId,
  );

  return NextResponse.json({ workout: mapWorkout(created) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.workout.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.user.role === "client" && existing.userId !== result.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.workout.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
