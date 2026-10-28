import { NextResponse } from "next/server";

import { lookupBarcode } from "@/lib/foods/lookup";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const result = await lookupBarcode(code);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, via: result.via ?? null },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    product: result.product,
    via: result.via,
  });
}
