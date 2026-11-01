import { NextRequest, NextResponse } from "next/server";

import { requireCoach, requireSession, resolveClientId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  advanceProgress,
  normalizeWorkoutPlan,
  type ProgramWeek,
  type WorkoutPlan,
  type WorkoutPlanProgress,
  type WorkoutSessionTemplate,
} from "@/lib/data/workout-plans";
import { fromJson, toJson } from "@/lib/json";

type PlanRow = {
  id: string;
  title: string;
  coachNote: string;
  assignedAt: Date;
  weeks: string;
  assignments: {
    userId: string;
    currentWeekIndex: number;
    currentDayIndex: number;
    completedDayIds: string;
  }[];
};

function mapProgress(assignment: {
  currentWeekIndex: number;
  currentDayIndex: number;
  completedDayIds: string;
}): WorkoutPlanProgress {
  return {
    currentWeekIndex: assignment.currentWeekIndex,
    currentDayIndex: assignment.currentDayIndex,
    completedDayIds: fromJson<string[]>(assignment.completedDayIds, []),
  };
}

function mapPlan(row: PlanRow, forUserId?: string | null): WorkoutPlan {
  const rawWeeks = fromJson<ProgramWeek[] | WorkoutSessionTemplate[]>(
    row.weeks,
    [],
  );
  const looksLikeLegacySessions =
    Array.isArray(rawWeeks) &&
    rawWeeks.length > 0 &&
    rawWeeks[0] != null &&
    "exercises" in rawWeeks[0] &&
    !("days" in rawWeeks[0]);

  const normalized = normalizeWorkoutPlan({
    id: row.id,
    title: row.title,
    coachNote: row.coachNote,
    assignedAt: row.assignedAt.toISOString(),
    assignedClientIds: row.assignments.map((a) => a.userId),
    weeks: looksLikeLegacySessions ? undefined : (rawWeeks as ProgramWeek[]),
    sessions: looksLikeLegacySessions
      ? (rawWeeks as WorkoutSessionTemplate[])
      : undefined,
  });

  if (forUserId) {
    const assignment = row.assignments.find((a) => a.userId === forUserId);
    if (assignment) {
      normalized.progress = mapProgress(assignment);
    }
  }

  return normalized;
}

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const scope = req.nextUrl.searchParams.get("scope");
  if (result.user.role === "coach" && scope === "all") {
    const plans = await prisma.workoutPlan.findMany({
      include: { assignments: true },
      orderBy: { assignedAt: "desc" },
    });
    return NextResponse.json({ plans: plans.map((row) => mapPlan(row)) });
  }

  const resolved = resolveClientId(
    result.user,
    req.nextUrl.searchParams.get("clientId") ??
      (result.user.role === "client" ? result.user.id : null),
  );
  if ("error" in resolved) return resolved.error;

  const plans = await prisma.workoutPlan.findMany({
    where: { assignments: { some: { userId: resolved.clientId } } },
    include: { assignments: true },
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json({
    plans: plans.map((row) => mapPlan(row, resolved.clientId)),
  });
}

export async function POST(req: NextRequest) {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const body = (await req.json()) as { plan: WorkoutPlan };
  const plan = body.plan;
  if (!plan?.title || !Array.isArray(plan.weeks)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const normalized = normalizeWorkoutPlan({
    ...plan,
    assignedAt: plan.assignedAt || new Date().toISOString(),
  });

  const created = await prisma.workoutPlan.create({
    data: {
      id: normalized.id,
      title: normalized.title,
      coachNote: normalized.coachNote,
      assignedAt: new Date(normalized.assignedAt),
      weeks: toJson(normalized.weeks),
      createdById: result.user.id,
      assignments: {
        create: (normalized.assignedClientIds ?? []).map((userId) => ({
          userId,
        })),
      },
    },
    include: { assignments: true },
  });

  return NextResponse.json({ plan: mapPlan(created) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    action?: "assign" | "completeDay" | "update";
    planId: string;
    assignedClientIds?: string[];
    plan?: WorkoutPlan;
    dayId?: string;
    clientId?: string;
  };

  if (!body.planId) {
    return NextResponse.json({ error: "planId required" }, { status: 400 });
  }

  const action = body.action ?? "assign";

  if (action === "assign" || action === "update") {
    const coach = await requireCoach();
    if ("error" in coach) return coach.error;

    if (action === "update" && body.plan) {
      const normalized = normalizeWorkoutPlan({
        ...body.plan,
        id: body.planId,
        assignedAt: body.plan.assignedAt || new Date().toISOString(),
      });
      const updated = await prisma.workoutPlan.update({
        where: { id: body.planId },
        data: {
          title: normalized.title,
          coachNote: normalized.coachNote,
          weeks: toJson(normalized.weeks),
        },
        include: { assignments: true },
      });
      return NextResponse.json({ plan: mapPlan(updated) });
    }

    if (!Array.isArray(body.assignedClientIds)) {
      return NextResponse.json(
        { error: "assignedClientIds required" },
        { status: 400 },
      );
    }

    const existing = await prisma.workoutPlanAssignment.findMany({
      where: { planId: body.planId },
    });
    const keep = new Set(body.assignedClientIds);
    await prisma.workoutPlanAssignment.deleteMany({
      where: {
        planId: body.planId,
        userId: { notIn: body.assignedClientIds },
      },
    });
    const existingIds = new Set(existing.map((row) => row.userId));
    const toCreate = body.assignedClientIds.filter((id) => !existingIds.has(id));
    if (toCreate.length > 0) {
      await prisma.workoutPlanAssignment.createMany({
        data: toCreate.map((userId) => ({
          planId: body.planId,
          userId,
        })),
      });
    }
    void keep;

    const plan = await prisma.workoutPlan.findUniqueOrThrow({
      where: { id: body.planId },
      include: { assignments: true },
    });
    return NextResponse.json({ plan: mapPlan(plan) });
  }

  if (action === "completeDay") {
    if (!body.dayId) {
      return NextResponse.json({ error: "dayId required" }, { status: 400 });
    }
    const resolved = resolveClientId(
      result.user,
      body.clientId ??
        (result.user.role === "client" ? result.user.id : null),
    );
    if ("error" in resolved) return resolved.error;

    if (
      result.user.role === "client" &&
      resolved.clientId !== result.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const planRow = await prisma.workoutPlan.findUnique({
      where: { id: body.planId },
      include: { assignments: true },
    });
    if (!planRow) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const assignment = planRow.assignments.find(
      (row) => row.userId === resolved.clientId,
    );
    if (!assignment) {
      return NextResponse.json({ error: "Not assigned" }, { status: 404 });
    }

    const plan = mapPlan(planRow, resolved.clientId);
    const next = advanceProgress(
      plan,
      mapProgress(assignment),
      body.dayId,
    );

    await prisma.workoutPlanAssignment.update({
      where: {
        planId_userId: {
          planId: body.planId,
          userId: resolved.clientId,
        },
      },
      data: {
        currentWeekIndex: next.currentWeekIndex,
        currentDayIndex: next.currentDayIndex,
        completedDayIds: toJson(next.completedDayIds),
      },
    });

    const refreshed = await prisma.workoutPlan.findUniqueOrThrow({
      where: { id: body.planId },
      include: { assignments: true },
    });

    return NextResponse.json({
      plan: mapPlan(refreshed, resolved.clientId),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
