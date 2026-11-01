import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const clients =
    result.user.role === "coach"
      ? await prisma.user.findMany({
          where: { role: "client" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true, phase: true },
        })
      : [];

  return NextResponse.json({
    user: result.user,
    clients,
  });
}
