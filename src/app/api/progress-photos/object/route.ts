import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { isSafeObjectKey, readObject } from "@/lib/object-storage";

/**
 * Authenticated image proxy for filesystem storage (and private S3 without a
 * public CDN base). Public S3/R2 URLs bypass this route.
 */
export async function GET(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const key = req.nextUrl.searchParams.get("key");
  if (!key || !isSafeObjectKey(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const row = await prisma.progressPhoto.findFirst({
    where: { objectKey: key },
    select: { userId: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (result.user.role === "client" && row.userId !== result.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (result.user.role === "coach") {
    const client = await prisma.user.findFirst({
      where: { id: row.userId, coachId: result.user.id },
      select: { id: true },
    });
    if (!client && row.userId !== result.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const object = await readObject(key);
  if (!object) {
    return NextResponse.json({ error: "Object missing" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(object.buffer), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(object.buffer.byteLength),
    },
  });
}
