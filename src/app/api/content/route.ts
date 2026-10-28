import { NextRequest, NextResponse } from "next/server";

import { requireCoach, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { ContentCategory, ContentItem, ContentType } from "@/lib/data/content";
import { fromJson, toJson } from "@/lib/json";

function mapItem(row: {
  id: string;
  title: string;
  summary: string;
  type: string;
  category: string;
  tags: string;
  postedAt: string;
  durationOrPages: string;
  body: string;
  openLabel: string;
  openHref: string | null;
}): ContentItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    type: row.type as ContentType,
    category: row.category as ContentCategory,
    tags: fromJson<string[]>(row.tags, []),
    postedAt: row.postedAt,
    durationOrPages: row.durationOrPages,
    body: row.body,
    openLabel: row.openLabel,
    openHref: row.openHref ?? undefined,
  };
}

export async function GET() {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const items = await prisma.contentItem.findMany({
    orderBy: { postedAt: "desc" },
  });
  const saved = await prisma.contentSaved.findMany({
    where: { userId: result.user.id },
    select: { contentId: true },
  });

  return NextResponse.json({
    items: items.map(mapItem),
    savedIds: saved.map((s) => s.contentId),
  });
}

export async function POST(req: NextRequest) {
  const result = await requireCoach();
  if ("error" in result) return result.error;

  const body = (await req.json()) as { item: ContentItem };
  const item = body.item;
  if (!item?.title || !item.id) {
    return NextResponse.json({ error: "Invalid item" }, { status: 400 });
  }

  const created = await prisma.contentItem.create({
    data: {
      id: item.id,
      title: item.title,
      summary: item.summary,
      type: item.type,
      category: item.category,
      tags: toJson(item.tags),
      postedAt: item.postedAt,
      durationOrPages: item.durationOrPages,
      body: item.body,
      openLabel: item.openLabel,
      openHref: item.openHref ?? null,
      createdById: result.user.id,
    },
  });

  return NextResponse.json({ item: mapItem(created) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const result = await requireSession();
  if ("error" in result) return result.error;

  const body = (await req.json()) as {
    action: "save" | "unsave";
    contentId: string;
  };
  if (!body.contentId || !body.action) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (body.action === "save") {
    await prisma.contentSaved.upsert({
      where: {
        userId_contentId: {
          userId: result.user.id,
          contentId: body.contentId,
        },
      },
      create: { userId: result.user.id, contentId: body.contentId },
      update: {},
    });
  } else {
    await prisma.contentSaved.deleteMany({
      where: { userId: result.user.id, contentId: body.contentId },
    });
  }

  const saved = await prisma.contentSaved.findMany({
    where: { userId: result.user.id },
    select: { contentId: true },
  });
  return NextResponse.json({ savedIds: saved.map((s) => s.contentId) });
}
