import { NextRequest, NextResponse } from "next/server";

import { requireCoach, requireSession, resolveClientId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type {
  WorkoutPlan,
  WorkoutSessionTemplate,
} from "@/lib/data/workout-plans";
import { fromJson, toJson } from "@/lib/json";

function mapPlan(row: {
  id: string;
  title: string;
  coachNote: string;
  assignedAt: Date;
  sessions: string;
  assignments: { userId: string }[];
}): WorkoutPlan {
  return {
    id: row.id,
    title: row.title,
    coachNote: row.coachNote,
    assignedAt: row.assignedAt.toISOString(),
    assignedClientIds: row.assignments.map((a) => a.userId),
    sessions: fromJson<WorkoutSessionTemplate[]>(row.sessions, []),
  };
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
    return NextResponse.json({ plans: plans.map(mapPlan) });
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

  return NextResponse.json({ plans: plans.map(mapPlan) });
}

export async function POST(req: NextRequest) {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const body = (await req.json()) as { plan: WorkoutPlan };
  const plan = body.plan;
  if (!plan?.title || !Array.isArray(plan.sessions)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const created = await prisma.workoutPlan.create({
    data: {
      id: plan.id,
      title: plan.title,
      coachNote: plan.coachNote,
      assignedAt: new Date(plan.assignedAt || Date.now()),
      sessions: toJson(plan.sessions),
      createdById: result.user.id,
      assignments: {
        create: (plan.assignedClientIds ?? []).map((userId) => ({ userId })),
      },
    },
    include: { assignments: true },
  });

  return NextResponse.json({ plan: mapPlan(created) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    planId: string;
    assignedClientIds: string[];
  };
  if (!body.planId || !Array.isArray(body.assignedClientIds)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.workoutPlanAssignment.deleteMany({ where: { planId: body.planId } });
  await prisma.workoutPlanAssignment.createMany({
    data: body.assignedClientIds.map((userId) => ({
      planId: body.planId,
      userId,
    })),
  });

  const plan = await prisma.workoutPlan.findUniqueOrThrow({
    where: { id: body.planId },
    include: { assignments: true },
  });

  return NextResponse.json({ plan: mapPlan(plan) });
}
