import { NextResponse } from "next/server";

import { auth } from "@/auth";

const publicPaths = [
  "/login",
  "/invite",
  "/api/auth",
  "/api/foods",
  "/api/invites/accept",
  "/api/invites/token",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublic) {
    if (pathname === "/login" && req.auth) {
      const role = req.auth.user?.role;
      const dest =
        role === "coach"
          ? "/coach"
          : req.auth.user?.onboardingComplete
            ? "/workouts"
            : "/onboarding";
      return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (!req.auth) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/coach") && req.auth.user?.role !== "coach") {
    return NextResponse.redirect(new URL("/workouts", req.nextUrl.origin));
  }

  const isClient = req.auth.user?.role === "client";
  const onboardingDone = Boolean(req.auth.user?.onboardingComplete);
  const onboardingPath =
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname.startsWith("/api/questionnaires");

  if (isClient && !onboardingDone && !onboardingPath) {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
  }

  if (isClient && onboardingDone && pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/workouts", req.nextUrl.origin));
  }

  if (pathname === "/") {
    if (req.auth.user?.role === "coach") {
      return NextResponse.redirect(new URL("/coach", req.nextUrl.origin));
    }
    const dest = onboardingDone ? "/workouts" : "/onboarding";
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
