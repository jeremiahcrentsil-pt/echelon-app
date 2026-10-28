import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { PlaceholderModule } from "@/components/modules/placeholder-module";

export const metadata: Metadata = { title: "Content" };

export default function ContentPage() {
  return (
    <PlaceholderModule
      title="Content"
      purpose="Watch videos and open PDFs or guides your coach posts for the client roster."
      icon={BookOpen}
    />
  );
}
