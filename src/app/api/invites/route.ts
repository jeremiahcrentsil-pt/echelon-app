import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireCoach } from "@/lib/auth-helpers";
import { createInviteToken } from "@/lib/crypto-token";
import { prisma } from "@/lib/db";
import {
  buildInviteUrl,
  deliverInviteLink,
  isInviteEmailConfigured,
} from "@/lib/invite-mail";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  templateId: z.string().optional(),
});

export async function GET() {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const [invites, clients] = await Promise.all([
    prisma.clientInvite.findMany({
      where: { coachId: result.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        template: { select: { id: true, title: true } },
        acceptedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phase: true,
            onboardingCompletedAt: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "client", coachId: result.user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phase: true,
        onboardingCompletedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    emailConfigured: isInviteEmailConfigured(),
    invites: invites.map((invite) => ({
      id: invite.id,
      token: invite.token,
      name: invite.name,
      email: invite.email,
      status: invite.status,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      inviteUrl: buildInviteUrl(invite.token),
      template: invite.template,
      acceptedUser: invite.acceptedUser
        ? {
            ...invite.acceptedUser,
            onboardingCompletedAt:
              invite.acceptedUser.onboardingCompletedAt?.toISOString() ?? null,
          }
        : null,
    })),
    clients: clients.map((client) => ({
      ...client,
      onboardingCompletedAt: client.onboardingCompletedAt?.toISOString() ?? null,
      createdAt: client.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Name and valid email required" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const name = parsed.data.name.trim();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with that email already exists" },
      { status: 409 },
    );
  }

  const pending = await prisma.clientInvite.findFirst({
    where: { email, coachId: result.user.id, status: "pending" },
  });
  if (pending) {
    return NextResponse.json(
      { error: "A pending invite already exists for that email" },
      { status: 409 },
    );
  }

  let template = parsed.data.templateId
    ? await prisma.questionnaireTemplate.findFirst({
        where: { id: parsed.data.templateId, coachId: result.user.id },
      })
    : await prisma.questionnaireTemplate.findFirst({
        where: { coachId: result.user.id, isDefault: true },
      });
  if (!template) {
    return NextResponse.json(
      { error: "No onboarding questionnaire template found. Seed or create one." },
      { status: 400 },
    );
  }

  const token = createInviteToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  const invite = await prisma.clientInvite.create({
    data: {
      token,
      email,
      name,
      coachId: result.user.id,
      templateId: template.id,
      status: "pending",
      expiresAt,
      assignment: {
        create: {
          templateId: template.id,
          status: "pending",
          // Freeze the coach's current form so later edits don't rewrite this invite
          fieldsSnapshot: template.fields,
        },
      },
    },
    include: { template: { select: { id: true, title: true } } },
  });

  const inviteUrl = buildInviteUrl(token);
  const delivery = await deliverInviteLink({
    toEmail: email,
    toName: name,
    inviteUrl,
    coachName: result.user.name || "Your coach",
  });

  return NextResponse.json(
    {
      invite: {
        id: invite.id,
        token: invite.token,
        name: invite.name,
        email: invite.email,
        status: invite.status,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt?.toISOString() ?? null,
        inviteUrl,
        template: invite.template,
        acceptedUser: null,
      },
      delivery,
    },
    { status: 201 },
  );
}
