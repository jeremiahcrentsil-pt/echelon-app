import type { Metadata } from "next";

import { MealPlansPanel } from "@/components/meal-plans/meal-plans-panel";

export const metadata: Metadata = { title: "Meal plans" };

export default function MealPlansPage() {
  return <MealPlansPanel />;
}
