import type { Metadata } from "next";

import { CheckInsPanel } from "@/components/check-ins/check-ins-panel";

export const metadata: Metadata = { title: "Check-ins" };

export default function CheckInsPage() {
  return <CheckInsPanel />;
}
