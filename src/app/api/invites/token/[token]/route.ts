import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fromJson } from "@/lib/json";
import type { QuestionnaireField } from "@/lib/data/questionnaire";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const invite = await prisma.clientInvite.findUnique({
    where: { token },
    include: {
      coach: { select: { name: true, email: true } },
      template: { select: { id: true, title: true, description: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.status === "revoked") {
    return NextResponse.json({ error: "Invite was revoked" }, { status: 410 });
  }

  if (invite.status === "accepted") {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 410 });
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  return NextResponse.json({
    invite: {
      name: invite.name,
      email: invite.email,
      status: invite.status,
      coachName: invite.coach.name,
      templateTitle: invite.template?.title ?? "Onboarding questionnaire",
      templateDescription: invite.template?.description ?? "",
    },
  });
}
