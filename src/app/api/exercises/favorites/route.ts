import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const favorites = await prisma.exerciseFavorite.findMany({
    where: { userId: result.user.id },
    select: { exerciseId: true },
  });

  return NextResponse.json({
    favoriteIds: favorites.map((f) => f.exerciseId),
  });
}

export async function PUT(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const body = (await req.json()) as { favoriteIds: string[] };
  if (!Array.isArray(body.favoriteIds)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.exerciseFavorite.deleteMany({ where: { userId: result.user.id } });
  if (body.favoriteIds.length > 0) {
    await prisma.exerciseFavorite.createMany({
      data: body.favoriteIds.map((exerciseId) => ({
        userId: result.user.id,
        exerciseId,
      })),
    });
  }

  return NextResponse.json({ favoriteIds: body.favoriteIds });
}
