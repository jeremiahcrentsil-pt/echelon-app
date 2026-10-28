import type { Metadata } from "next";
import { Camera } from "lucide-react";

import { PlaceholderModule } from "@/components/modules/placeholder-module";

export const metadata: Metadata = { title: "Progress photos" };

export default function ProgressPhotosPage() {
  return (
    <PlaceholderModule
      title="Progress photos"
      purpose="Capture dated progress photos in a consistent setup so visual change is easy to compare."
      icon={Camera}
    />
  );
}
