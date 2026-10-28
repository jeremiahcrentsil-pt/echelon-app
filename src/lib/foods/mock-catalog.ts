import type { FoodMacros } from "@/lib/data/nutrition";

export type FoodProduct = {
  barcode: string;
  name: string;
  brand?: string;
  servingLabel: string;
  perServing: FoodMacros;
  source: "mock" | "openfoodfacts";
};

/** Known demo barcodes so Scan works offline / when OFF is unreachable. */
export const MOCK_CATALOG: Record<string, FoodProduct> = {
  "0041200012345": {
    barcode: "0041200012345",
    name: "Rolled oats",
    brand: "Quaker",
    servingLabel: "40 g dry",
    perServing: { calories: 150, proteinG: 5, carbsG: 27, fatG: 3 },
    source: "mock",
  },
  "0011110001234": {
    barcode: "0011110001234",
    name: "Whey isolate",
    brand: "Echelon Kitchen",
    servingLabel: "1 scoop (30 g)",
    perServing: { calories: 110, proteinG: 25, carbsG: 2, fatG: 0.5 },
    source: "mock",
  },
  "0737628064503": {
    barcode: "0737628064503",
    name: "Almond butter",
    brand: "Justin’s",
    servingLabel: "2 tbsp (32 g)",
    perServing: { calories: 190, proteinG: 7, carbsG: 6, fatG: 18 },
    source: "mock",
  },
  "5000112588130": {
    barcode: "5000112588130",
    name: "Coca-Cola",
    brand: "Coca-Cola",
    servingLabel: "330 ml can",
    perServing: { calories: 139, proteinG: 0, carbsG: 35, fatG: 0 },
    source: "mock",
  },
  "3017620422003": {
    barcode: "3017620422003",
    name: "Nutella",
    brand: "Ferrero",
    servingLabel: "15 g",
    perServing: { calories: 80, proteinG: 1, carbsG: 8.5, fatG: 5 },
    source: "mock",
  },
};

export function findMockProduct(barcode: string): FoodProduct | null {
  const normalized = barcode.replace(/\s+/g, "");
  return MOCK_CATALOG[normalized] ?? null;
}

export const DEMO_BARCODES = Object.keys(MOCK_CATALOG);
