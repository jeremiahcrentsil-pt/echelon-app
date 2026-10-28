import type { Metadata } from "next";

import { CoachPlansPanel } from "@/components/coach/coach-plans-panel";

export const metadata: Metadata = { title: "Assign plans · Coach" };

export default function CoachPlansPage() {
  return <CoachPlansPanel />;
}
