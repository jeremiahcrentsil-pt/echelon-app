import { NextRequest, NextResponse } from "next/server";

import { requireCoach, requireSession, resolveClientId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type {
  MealCompletion,
  MealPlan,
  PlanDay,
} from "@/lib/data/meal-plans";
import { fromJson, toJson } from "@/lib/json";

function mapPlan(row: {
  id: string;
  title: string;
  coachNote: string;
  calorieTarget: number;
  proteinTargetG: number;
  assignedAt: Date;
  days: string;
  assignments: { userId: string }[];
}): MealPlan {
  return {
    id: row.id,
    title: row.title,
    coachNote: row.coachNote,
    calorieTarget: row.calorieTarget,
    proteinTargetG: row.proteinTargetG,
    assignedAt: row.assignedAt.toISOString(),
    assignedClientIds: row.assignments.map((a) => a.userId),
    days: fromJson<PlanDay[]>(row.days, []),
  };
}

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const scope = req.nextUrl.searchParams.get("scope");
  const clientParam = req.nextUrl.searchParams.get("clientId");

  if (result.user.role === "coach" && scope === "all") {
    const plans = await prisma.mealPlan.findMany({
      include: { assignments: true },
      orderBy: { assignedAt: "desc" },
    });
    const completions = await prisma.mealCompletion.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({
      plans: plans.map(mapPlan),
      completions: completions.map(
        (c): MealCompletion => ({
          mealId: c.mealId,
          dateKey: c.dateKey,
          eaten: c.eaten,
          adherenceNote: c.adherenceNote ?? undefined,
          updatedAt: c.updatedAt.toISOString(),
        }),
      ),
    });
  }

  const resolved = resolveClientId(
    result.user,
    clientParam ?? (result.user.role === "client" ? result.user.id : null),
  );
  if ("error" in resolved) return resolved.error;

  const plans = await prisma.mealPlan.findMany({
    where: { assignments: { some: { userId: resolved.clientId } } },
    include: { assignments: true },
    orderBy: { assignedAt: "desc" },
  });
  const completions = await prisma.mealCompletion.findMany({
    where: { userId: resolved.clientId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    plans: plans.map(mapPlan),
    completions: completions.map(
      (c): MealCompletion => ({
        mealId: c.mealId,
        dateKey: c.dateKey,
        eaten: c.eaten,
        adherenceNote: c.adherenceNote ?? undefined,
        updatedAt: c.updatedAt.toISOString(),
      }),
    ),
  });
}

export async function POST(req: NextRequest) {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const body = (await req.json()) as { plan: MealPlan };
  const plan = body.plan;
  if (!plan?.title || !Array.isArray(plan.days)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const created = await prisma.mealPlan.create({
    data: {
      id: plan.id,
      title: plan.title,
      coachNote: plan.coachNote,
      calorieTarget: plan.calorieTarget,
      proteinTargetG: plan.proteinTargetG,
      assignedAt: new Date(plan.assignedAt || Date.now()),
      days: toJson(plan.days),
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
  const result = await requireSession();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    action: "completion" | "assign";
    clientId?: string;
    completion?: MealCompletion;
    planId?: string;
    assignedClientIds?: string[];
  };

  if (body.action === "completion") {
    const resolved = resolveClientId(result.user, body.clientId);
    if ("error" in resolved) return resolved.error;
    const completion = body.completion;
    if (!completion?.mealId || !completion.dateKey) {
      return NextResponse.json({ error: "Invalid completion" }, { status: 400 });
    }

    const saved = await prisma.mealCompletion.upsert({
      where: {
        userId_mealId_dateKey: {
          userId: resolved.clientId,
          mealId: completion.mealId,
          dateKey: completion.dateKey,
        },
      },
      create: {
        userId: resolved.clientId,
        mealId: completion.mealId,
        dateKey: completion.dateKey,
        eaten: completion.eaten,
        adherenceNote: completion.adherenceNote ?? null,
      },
      update: {
        eaten: completion.eaten,
        adherenceNote: completion.adherenceNote ?? null,
      },
    });

    return NextResponse.json({
      completion: {
        mealId: saved.mealId,
        dateKey: saved.dateKey,
        eaten: saved.eaten,
        adherenceNote: saved.adherenceNote ?? undefined,
        updatedAt: saved.updatedAt.toISOString(),
      } satisfies MealCompletion,
    });
  }

  if (body.action === "assign") {
    const coach = await requireCoach();
    if ("error" in coach) return coach.error;
    if (!body.planId || !Array.isArray(body.assignedClientIds)) {
      return NextResponse.json({ error: "Invalid assign payload" }, { status: 400 });
    }
    await prisma.mealPlanAssignment.deleteMany({ where: { planId: body.planId } });
    await prisma.mealPlanAssignment.createMany({
      data: body.assignedClientIds.map((userId) => ({
        planId: body.planId!,
        userId,
      })),
    });
    const plan = await prisma.mealPlan.findUniqueOrThrow({
      where: { id: body.planId },
      include: { assignments: true },
    });
    return NextResponse.json({ plan: mapPlan(plan) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
