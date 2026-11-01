import type { Metadata } from "next";

import { CoachProgramsPanel } from "@/components/coach/coach-programs-panel";

export const metadata: Metadata = { title: "Workout programs" };

export default function CoachProgramsPage() {
  return <CoachProgramsPanel />;
}
