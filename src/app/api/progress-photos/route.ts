import { NextRequest, NextResponse } from "next/server";

import { requireSession, resolveClientId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { PhotoPose, ProgressPhoto } from "@/lib/data/progress-photos";
import { MAX_PHOTOS, MAX_STORE_BYTES } from "@/lib/data/progress-photos";

function mapPhoto(row: {
  id: string;
  date: string;
  pose: string;
  note: string | null;
  dataUrl: string;
  width: number;
  height: number;
  bytesApprox: number;
  createdAt: Date;
}): ProgressPhoto {
  return {
    id: row.id,
    date: row.date,
    pose: row.pose as PhotoPose,
    note: row.note ?? undefined,
    dataUrl: row.dataUrl,
    width: row.width,
    height: row.height,
    bytesApprox: row.bytesApprox,
    createdAt: row.createdAt.toISOString(),
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

  const rows = await prisma.progressPhoto.findMany({
    where: { userId: resolved.clientId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ photos: rows.map(mapPhoto) });
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    clientId?: string;
    photo: ProgressPhoto;
  };
  const resolved = resolveClientId(result.user, body.clientId);
  if ("error" in resolved) return resolved.error;

  const photo = body.photo;
  if (!photo?.dataUrl || !photo.date || !photo.pose) {
    return NextResponse.json({ error: "Invalid photo" }, { status: 400 });
  }

  const existing = await prisma.progressPhoto.findMany({
    where: { userId: resolved.clientId },
    select: { bytesApprox: true },
  });
  if (existing.length >= MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Photo limit reached (${MAX_PHOTOS})` },
      { status: 400 },
    );
  }
  const totalBytes =
    existing.reduce((sum, p) => sum + p.bytesApprox, 0) + photo.bytesApprox;
  if (totalBytes > MAX_STORE_BYTES) {
    return NextResponse.json(
      { error: "Photo storage budget exceeded" },
      { status: 400 },
    );
  }

  const created = await prisma.progressPhoto.create({
    data: {
      id: photo.id,
      userId: resolved.clientId,
      date: photo.date,
      pose: photo.pose,
      note: photo.note ?? null,
      dataUrl: photo.dataUrl,
      width: photo.width,
      height: photo.height,
      bytesApprox: photo.bytesApprox,
      createdAt: new Date(photo.createdAt || Date.now()),
    },
  });

  return NextResponse.json({ photo: mapPhoto(created) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = await prisma.progressPhoto.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.user.role === "client" && existing.userId !== result.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.progressPhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
