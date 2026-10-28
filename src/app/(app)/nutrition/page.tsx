import type { Metadata } from "next";

import { NutritionLogger } from "@/components/nutrition/nutrition-logger";

export const metadata: Metadata = { title: "Nutrition" };

export default function NutritionPage() {
  return <NutritionLogger />;
}
