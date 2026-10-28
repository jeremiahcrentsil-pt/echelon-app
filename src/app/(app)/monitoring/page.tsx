import type { Metadata } from "next";

import { MonitoringPanel } from "@/components/monitoring/monitoring-panel";

export const metadata: Metadata = { title: "Monitoring" };

export default function MonitoringPage() {
  return <MonitoringPanel />;
}
