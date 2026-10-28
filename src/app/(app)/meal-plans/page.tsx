import type { Metadata } from "next";
import { UtensilsCrossed } from "lucide-react";

import { PlaceholderModule } from "@/components/modules/placeholder-module";

export const metadata: Metadata = { title: "Meal plans" };

export default function MealPlansPage() {
  return (
    <PlaceholderModule
      title="Meal plans"
      purpose="Open the meal plans your coach assigned and follow them through the week."
      icon={UtensilsCrossed}
    />
  );
}
