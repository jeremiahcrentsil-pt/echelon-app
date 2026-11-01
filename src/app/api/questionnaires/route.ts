import { NextRequest, NextResponse } from "next/server";

import { requireCoach, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { fromJson, toJson } from "@/lib/json";
import type { QuestionnaireField } from "@/lib/data/questionnaire";

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const scope = req.nextUrl.searchParams.get("scope");

  if (result.user.role === "coach" && scope === "review") {
    const submissions = await prisma.questionnaireSubmission.findMany({
      where: {
        user: { coachId: result.user.id },
      },
      orderBy: { submittedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignment: {
          include: {
            template: { select: { id: true, title: true, fields: true } },
          },
        },
      },
    });

    return NextResponse.json({
      submissions: submissions.map((row) => ({
        id: row.id,
        submittedAt: row.submittedAt.toISOString(),
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        coachNote: row.coachNote,
        answers: fromJson<Record<string, string>>(row.answers, {}),
        client: row.user,
        templateTitle: row.assignment.template.title,
        fields: fromJson<QuestionnaireField[]>(row.assignment.template.fields, []),
      })),
    });
  }

  // Client: pending assignment for onboarding
  if (result.user.role !== "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignment = await prisma.questionnaireAssignment.findFirst({
    where: {
      userId: result.user.id,
      status: "pending",
    },
    include: {
      template: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const user = await prisma.user.findUnique({
    where: { id: result.user.id },
    select: { onboardingCompletedAt: true },
  });

  if (!assignment) {
    return NextResponse.json({
      assignment: null,
      onboardingComplete: Boolean(user?.onboardingCompletedAt),
    });
  }

  return NextResponse.json({
    assignment: {
      id: assignment.id,
      status: assignment.status,
      title: assignment.template.title,
      description: assignment.template.description,
      fields: fromJson<QuestionnaireField[]>(assignment.template.fields, []),
    },
    onboardingComplete: Boolean(user?.onboardingCompletedAt),
  });
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  if (result.user.role !== "client") {
    return NextResponse.json({ error: "Only clients submit questionnaires" }, { status: 403 });
  }

  const body = (await req.json()) as {
    assignmentId: string;
    answers: Record<string, string>;
  };

  if (!body.assignmentId || !body.answers) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const assignment = await prisma.questionnaireAssignment.findUnique({
    where: { id: body.assignmentId },
    include: { template: true },
  });

  if (!assignment || assignment.userId !== result.user.id) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }
  if (assignment.status === "completed") {
    return NextResponse.json({ error: "Already completed" }, { status: 409 });
  }

  const fields = fromJson<QuestionnaireField[]>(assignment.template.fields, []);
  for (const field of fields) {
    if (field.required && !String(body.answers[field.id] ?? "").trim()) {
      return NextResponse.json(
        { error: `Missing required field: ${field.label}` },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.questionnaireSubmission.create({
      data: {
        assignmentId: assignment.id,
        userId: result.user.id,
        answers: toJson(body.answers),
        submittedAt: new Date(),
      },
    });
    await tx.questionnaireAssignment.update({
      where: { id: assignment.id },
      data: { status: "completed", completedAt: new Date() },
    });
    await tx.user.update({
      where: { id: result.user.id },
      data: { onboardingCompletedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true, onboardingComplete: true });
}

export async function PATCH(req: NextRequest) {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    submissionId: string;
    coachNote?: string;
    reviewed?: boolean;
  };

  if (!body.submissionId) {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 });
  }

  const existing = await prisma.questionnaireSubmission.findUnique({
    where: { id: body.submissionId },
    include: { user: { select: { coachId: true } } },
  });
  if (!existing || existing.user.coachId !== result.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.questionnaireSubmission.update({
    where: { id: body.submissionId },
    data: {
      coachNote: body.coachNote ?? undefined,
      reviewedAt: body.reviewed === false ? null : new Date(),
    },
  });

  return NextResponse.json({
    submission: {
      id: updated.id,
      coachNote: updated.coachNote,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
    },
  });
}
