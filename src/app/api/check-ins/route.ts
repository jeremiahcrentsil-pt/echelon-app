import { NextRequest, NextResponse } from "next/server";

import { requireCoach, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { CheckInSubmission } from "@/lib/data/check-ins";
import { fromJson, toJson } from "@/lib/json";

function mapSubmission(
  row: {
    id: string;
    userId: string;
    formId: string;
    formTitle: string;
    submittedAt: Date;
    answers: string;
    reviewedAt: Date | null;
    coachNote: string | null;
  },
  userName: string,
): CheckInSubmission {
  return {
    id: row.id,
    formId: row.formId,
    formTitle: row.formTitle,
    submittedAt: row.submittedAt.toISOString(),
    answers: fromJson<Record<string, string>>(row.answers, {}),
    clientId: row.userId,
    clientName: userName,
    reviewedAt: row.reviewedAt?.toISOString(),
    coachNote: row.coachNote ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const all = req.nextUrl.searchParams.get("scope") === "all";
  if (all && result.user.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.checkInSubmission.findMany({
    where: all ? undefined : { userId: result.user.id },
    orderBy: { submittedAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    submissions: rows.map((row) => mapSubmission(row, row.user.name)),
  });
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  if (result.user.role !== "client") {
    return NextResponse.json(
      { error: "Only clients submit check-ins" },
      { status: 403 },
    );
  }

  const body = (await req.json()) as {
    formId: string;
    formTitle: string;
    answers: Record<string, string>;
  };

  if (!body.formId || !body.formTitle || !body.answers) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const created = await prisma.checkInSubmission.create({
    data: {
      userId: result.user.id,
      formId: body.formId,
      formTitle: body.formTitle,
      submittedAt: new Date(),
      answers: toJson(body.answers),
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(
    { submission: mapSubmission(created, created.user.name) },
    { status: 201 },
  );
}

export async function PATCH(req: NextRequest) {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    id: string;
    coachNote?: string;
    reviewed?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const updated = await prisma.checkInSubmission.update({
    where: { id: body.id },
    data: {
      coachNote: body.coachNote ?? undefined,
      reviewedAt: body.reviewed === false ? null : new Date(),
    },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    submission: mapSubmission(updated, updated.user.name),
  });
}
