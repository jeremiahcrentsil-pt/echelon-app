import type { Metadata } from "next";
import { Library } from "lucide-react";

import { PlaceholderModule } from "@/components/modules/placeholder-module";

export const metadata: Metadata = { title: "Exercises" };

export default function ExercisesPage() {
  return (
    <PlaceholderModule
      title="Exercises"
      purpose="Browse a library of exercises with cues, variations, and reference demos."
      icon={Library}
    />
  );
}
