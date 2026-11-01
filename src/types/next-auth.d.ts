import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "coach" | "client";
      phase?: string;
      coachId?: string;
      onboardingComplete?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "coach" | "client";
    phase?: string;
    coachId?: string;
    onboardingComplete?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "coach" | "client";
    phase?: string;
    coachId?: string;
    onboardingComplete?: boolean;
  }
}
