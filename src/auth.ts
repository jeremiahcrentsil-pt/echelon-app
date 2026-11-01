import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? "echelon-dev-secret-change-me-in-prod",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "coach" | "client",
          phase: user.phase ?? undefined,
          coachId: user.coachId ?? undefined,
          onboardingComplete: Boolean(user.onboardingCompletedAt) || user.role === "coach",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role?: string }).role ?? "client";
        token.phase = (user as { phase?: string }).phase;
        token.coachId = (user as { coachId?: string }).coachId;
        token.onboardingComplete =
          (user as { onboardingComplete?: boolean }).onboardingComplete ?? false;
      }

      // Refresh onboarding flag after questionnaire submit (session.update())
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            onboardingCompletedAt: true,
            role: true,
            coachId: true,
            phase: true,
            name: true,
          },
        });
        if (dbUser) {
          token.onboardingComplete =
            Boolean(dbUser.onboardingCompletedAt) || dbUser.role === "coach";
          token.coachId = dbUser.coachId ?? undefined;
          token.phase = dbUser.phase ?? undefined;
          token.name = dbUser.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "coach" | "client") ?? "client";
        session.user.phase = token.phase as string | undefined;
        session.user.coachId = token.coachId as string | undefined;
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
      }
      return session;
    },
  },
});
