import { NextRequest, NextResponse } from "next/server";

import { requireCoach, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { fromJson, toJson } from "@/lib/json";
import {
  normalizeFields,
  resolveAssignmentFields,
  type QuestionnaireField,
  type QuestionnaireTemplateData,
} from "@/lib/data/questionnaire";

function mapTemplate(row: {
  id: string;
  title: string;
  description: string;
  fields: string;
  isDefault: boolean;
  updatedAt: Date;
}): QuestionnaireTemplateData {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    fields: fromJson<QuestionnaireField[]>(row.fields, []),
    isDefault: row.isDefault,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const scope = req.nextUrl.searchParams.get("scope");

  if (result.user.role === "coach" && scope === "template") {
    const template = await prisma.questionnaireTemplate.findFirst({
      where: { coachId: result.user.id, isDefault: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!template) {
      return NextResponse.json({ template: null });
    }
    return NextResponse.json({ template: mapTemplate(template) });
  }

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
            template: {
              select: { id: true, title: true, fields: true },
            },
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
        fields: resolveAssignmentFields(
          row.assignment.fieldsSnapshot,
          row.assignment.template.fields,
        ),
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
      fields: resolveAssignmentFields(
        assignment.fieldsSnapshot,
        assignment.template.fields,
      ),
    },
    onboardingComplete: Boolean(user?.onboardingCompletedAt),
  });
}

export async function PUT(req: NextRequest) {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    templateId?: string;
    title?: string;
    description?: string;
    fields?: QuestionnaireField[];
  };

  if (!Array.isArray(body.fields)) {
    return NextResponse.json({ error: "fields required" }, { status: 400 });
  }

  const fields = normalizeFields(body.fields);
  if (fields.length === 0) {
    return NextResponse.json(
      { error: "Add at least one question" },
      { status: 400 },
    );
  }

  let template = body.templateId
    ? await prisma.questionnaireTemplate.findFirst({
        where: { id: body.templateId, coachId: result.user.id },
      })
    : await prisma.questionnaireTemplate.findFirst({
        where: { coachId: result.user.id, isDefault: true },
      });

  if (!template) {
    template = await prisma.questionnaireTemplate.create({
      data: {
        coachId: result.user.id,
        title: body.title?.trim() || "Initial client questionnaire",
        description:
          body.description?.trim() ||
          "Goals, experience, and availability so coaching can start sharp.",
        fields: toJson(fields),
        isDefault: true,
      },
    });
  } else {
    template = await prisma.questionnaireTemplate.update({
      where: { id: template.id },
      data: {
        title: body.title?.trim() || template.title,
        description:
          body.description?.trim() !== undefined
            ? body.description.trim()
            : template.description,
        fields: toJson(fields),
      },
    });
  }

  return NextResponse.json({ template: mapTemplate(template) });
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

  const fields = resolveAssignmentFields(
    assignment.fieldsSnapshot,
    assignment.template.fields,
  );
  for (const field of fields) {
    if (!field.required) continue;
    const raw = body.answers[field.id] ?? "";
    if (field.type === "multiselect") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return NextResponse.json(
            { error: `Missing required field: ${field.label}` },
            { status: 400 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: `Missing required field: ${field.label}` },
          { status: 400 },
        );
      }
    } else if (!String(raw).trim()) {
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
      data: {
        status: "completed",
        completedAt: new Date(),
        // Ensure snapshot exists for future review even if invite predated the column
        fieldsSnapshot: assignment.fieldsSnapshot ?? toJson(fields),
      },
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
