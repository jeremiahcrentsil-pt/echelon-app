import type { Metadata } from "next";

import { ProgressPhotosPanel } from "@/components/progress-photos/progress-photos-panel";

export const metadata: Metadata = { title: "Progress photos" };

export default function ProgressPhotosPage() {
  return <ProgressPhotosPanel />;
}
