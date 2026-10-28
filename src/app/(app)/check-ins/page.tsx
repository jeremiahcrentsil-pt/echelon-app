import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";

import { PlaceholderModule } from "@/components/modules/placeholder-module";

export const metadata: Metadata = { title: "Check-ins" };

export default function CheckInsPage() {
  return (
    <PlaceholderModule
      title="Check-ins"
      purpose="Submit periodic check-in forms covering adherence, energy, and how training is landing."
      icon={ClipboardCheck}
    />
  );
}
