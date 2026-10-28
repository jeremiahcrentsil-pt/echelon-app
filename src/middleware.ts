import { NextResponse } from "next/server";

import { auth } from "@/auth";

const publicPaths = ["/login", "/api/auth", "/api/foods"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublic) {
    if (pathname === "/login" && req.auth) {
      const role = req.auth.user?.role;
      const dest = role === "coach" ? "/coach" : "/workouts";
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

  if (pathname === "/") {
    const dest = req.auth.user?.role === "coach" ? "/coach" : "/workouts";
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
