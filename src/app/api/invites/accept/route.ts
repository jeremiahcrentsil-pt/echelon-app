import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";

const acceptSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6).max(120),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = acceptSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Valid token and password (min 6 chars) required" },
      { status: 400 },
    );
  }

  const invite = await prisma.clientInvite.findUnique({
    where: { token: parsed.data.token },
    include: { assignment: true },
  });

  if (!invite || invite.status === "revoked") {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.status === "accepted") {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 410 });
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const email = invite.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists — sign in instead" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const name = (parsed.data.name?.trim() || invite.name).trim();

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name,
        role: "client",
        passwordHash,
        coachId: invite.coachId,
      },
    });

    await tx.clientInvite.update({
      where: { id: invite.id },
      data: {
        status: "accepted",
        acceptedUserId: created.id,
      },
    });

    if (invite.assignment) {
      await tx.questionnaireAssignment.update({
        where: { id: invite.assignment.id },
        data: { userId: created.id },
      });
    }

    return created;
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    message: "Account created. Sign in, then complete your onboarding questionnaire.",
  });
}
