import type { Metadata } from "next";
import { Apple } from "lucide-react";

import { PlaceholderModule } from "@/components/modules/placeholder-module";

export const metadata: Metadata = { title: "Nutrition" };

export default function NutritionPage() {
  return (
    <PlaceholderModule
      title="Nutrition"
      purpose="Log meals and macros day by day so intake stays aligned with your coaching targets."
      icon={Apple}
    />
  );
}
