import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const dbUser = await prisma.user.findUnique({
    where: { id: result.user.id },
    select: {
      onboardingCompletedAt: true,
      coachId: true,
      phase: true,
    },
  });

  const clients =
    result.user.role === "coach"
      ? await prisma.user.findMany({
          where: { role: "client", coachId: result.user.id },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            phase: true,
            onboardingCompletedAt: true,
          },
        })
      : [];

  return NextResponse.json({
    user: {
      ...result.user,
      coachId: dbUser?.coachId ?? result.user.coachId,
      phase: dbUser?.phase ?? result.user.phase,
      onboardingComplete:
        Boolean(dbUser?.onboardingCompletedAt) || result.user.role === "coach",
    },
    clients: clients.map((client) => ({
      ...client,
      onboardingCompletedAt: client.onboardingCompletedAt?.toISOString() ?? null,
    })),
  });
}
