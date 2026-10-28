import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { PlaceholderModule } from "@/components/modules/placeholder-module";

export const metadata: Metadata = { title: "Monitoring" };

export default function MonitoringPage() {
  return (
    <PlaceholderModule
      title="Monitoring"
      purpose="Fill short daily monitoring forms — sleep, stress, recovery — so trends stay visible."
      icon={Activity}
    />
  );
}
