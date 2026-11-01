import type { Metadata } from "next";

import { CoachCheckInsPanel } from "@/components/coach/coach-checkins-panel";

export const metadata: Metadata = { title: "Review check-ins · Coach" };

export default function CoachCheckInsPage() {
  return <CoachCheckInsPanel />;
}
