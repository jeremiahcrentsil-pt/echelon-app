import { NextResponse } from "next/server";

import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "coach" | "client";
  phase?: string;
};

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user: SessionUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role ?? "client",
    phase: session.user.phase,
  };
  return { user };
}

export async function requireCoach() {
  const result = await requireSession();
  if ("error" in result) return result;
  if (result.user.role !== "coach") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}

/** Resolve which client userId a request operates on. */
export function resolveClientId(
  user: SessionUser,
  requestedClientId?: string | null,
): { clientId: string } | { error: NextResponse } {
  if (user.role === "client") {
    return { clientId: user.id };
  }
  if (!requestedClientId) {
    return {
      error: NextResponse.json(
        { error: "clientId is required for coach requests" },
        { status: 400 },
      ),
    };
  }
  return { clientId: requestedClientId };
}
