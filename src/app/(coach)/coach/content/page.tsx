import type { Metadata } from "next";

import { CoachContentPanel } from "@/components/coach/coach-content-panel";

export const metadata: Metadata = { title: "Post content · Coach" };

export default function CoachContentPage() {
  return <CoachContentPanel />;
}
