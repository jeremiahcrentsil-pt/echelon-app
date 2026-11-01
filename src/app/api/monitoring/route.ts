import { NextRequest, NextResponse } from "next/server";

import { requireSession, resolveClientId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { MonitoringEntry } from "@/lib/data/monitoring";

function mapEntry(row: {
  id: string;
  date: string;
  steps: number;
  waterLiters: number;
  readiness: number;
  mood: number;
  sleepQuality: number;
  notes: string | null;
  loggedAt: Date;
}): MonitoringEntry {
  return {
    id: row.id,
    date: row.date,
    steps: row.steps,
    waterLiters: row.waterLiters,
    readiness: row.readiness,
    mood: row.mood,
    sleepQuality: row.sleepQuality,
    notes: row.notes ?? undefined,
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

  const rows = await prisma.monitoringEntry.findMany({
    where: { userId: resolved.clientId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ entries: rows.map(mapEntry) });
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    clientId?: string;
    entry: MonitoringEntry;
  };
  const resolved = resolveClientId(result.user, body.clientId);
  if ("error" in resolved) return resolved.error;

  const entry = body.entry;
  if (!entry?.date) {
    return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  }

  const saved = await prisma.monitoringEntry.upsert({
    where: {
      userId_date: { userId: resolved.clientId, date: entry.date },
    },
    create: {
      id: entry.id,
      userId: resolved.clientId,
      date: entry.date,
      steps: entry.steps,
      waterLiters: entry.waterLiters,
      readiness: entry.readiness,
      mood: entry.mood,
      sleepQuality: entry.sleepQuality,
      notes: entry.notes ?? null,
      loggedAt: new Date(entry.loggedAt || Date.now()),
    },
    update: {
      steps: entry.steps,
      waterLiters: entry.waterLiters,
      readiness: entry.readiness,
      mood: entry.mood,
      sleepQuality: entry.sleepQuality,
      notes: entry.notes ?? null,
      loggedAt: new Date(entry.loggedAt || Date.now()),
    },
  });

  return NextResponse.json({ entry: mapEntry(saved) });
}
