import { NextRequest, NextResponse } from "next/server";

import { requireSession, resolveClientId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { FoodEntry, FoodMacros, MealType } from "@/lib/data/nutrition";
import { fromJson, toJson } from "@/lib/json";

function mapEntry(row: {
  id: string;
  date: string;
  meal: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  servingLabel: string;
  servings: number;
  macros: string;
  source: string;
  loggedAt: Date;
}): FoodEntry {
  return {
    id: row.id,
    date: row.date,
    meal: row.meal as MealType,
    name: row.name,
    brand: row.brand ?? undefined,
    barcode: row.barcode ?? undefined,
    servingLabel: row.servingLabel,
    servings: row.servings,
    macros: fromJson<FoodMacros>(row.macros, {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    }),
    source: row.source as FoodEntry["source"],
    loggedAt: row.loggedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const resolved = resolveClientId(
    result.user,
    req.nextUrl.searchParams.get("clientId"),
  );
  if ("error" in resolved) return resolved.error;

  const rows = await prisma.nutritionEntry.findMany({
    where: { userId: resolved.clientId },
    orderBy: [{ date: "desc" }, { loggedAt: "desc" }],
  });

  return NextResponse.json({ entries: rows.map(mapEntry) });
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const body = (await req.json()) as { clientId?: string; entry: FoodEntry };
  const resolved = resolveClientId(result.user, body.clientId);
  if ("error" in resolved) return resolved.error;

  const entry = body.entry;
  if (!entry?.name || !entry.date || !entry.meal) {
    return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  }

  const created = await prisma.nutritionEntry.create({
    data: {
      id: entry.id,
      userId: resolved.clientId,
      date: entry.date,
      meal: entry.meal,
      name: entry.name,
      brand: entry.brand ?? null,
      barcode: entry.barcode ?? null,
      servingLabel: entry.servingLabel,
      servings: entry.servings,
      macros: toJson(entry.macros),
      source: entry.source,
      loggedAt: new Date(entry.loggedAt || Date.now()),
    },
  });

  return NextResponse.json({ entry: mapEntry(created) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.nutritionEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.user.role === "client" && existing.userId !== result.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.nutritionEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
