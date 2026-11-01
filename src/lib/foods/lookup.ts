import { findMockProduct, type FoodProduct } from "@/lib/foods/mock-catalog";

type OffNutriments = {
  "energy-kcal_serving"?: number;
  "energy-kcal_100g"?: number;
  proteins_serving?: number;
  proteins_100g?: number;
  carbohydrates_serving?: number;
  carbohydrates_100g?: number;
  fat_serving?: number;
  fat_100g?: number;
};

type OffProduct = {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: OffNutriments;
};

type OffResponse = {
  status: number;
  product?: OffProduct;
};

function pickMacro(
  nutriments: OffNutriments | undefined,
  servingKey: keyof OffNutriments,
  per100Key: keyof OffNutriments,
) {
  const serving = nutriments?.[servingKey];
  if (typeof serving === "number" && Number.isFinite(serving)) return serving;
  const per100 = nutriments?.[per100Key];
  if (typeof per100 === "number" && Number.isFinite(per100)) return per100;
  return 0;
}

function fromOpenFoodFacts(barcode: string, product: OffProduct): FoodProduct {
  const nutriments = product.nutriments;
  const hasServing =
    typeof nutriments?.["energy-kcal_serving"] === "number" ||
    typeof nutriments?.proteins_serving === "number";

  return {
    barcode,
    name: product.product_name || product.product_name_en || "Unknown product",
    brand: product.brands?.split(",")[0]?.trim() || undefined,
    servingLabel: product.serving_size
      ? product.serving_size
      : hasServing
        ? "1 serving"
        : "100 g",
    perServing: {
      calories: Math.round(
        pickMacro(nutriments, "energy-kcal_serving", "energy-kcal_100g"),
      ),
      proteinG:
        Math.round(
          pickMacro(nutriments, "proteins_serving", "proteins_100g") * 10,
        ) / 10,
      carbsG:
        Math.round(
          pickMacro(nutriments, "carbohydrates_serving", "carbohydrates_100g") *
            10,
        ) / 10,
      fatG:
        Math.round(pickMacro(nutriments, "fat_serving", "fat_100g") * 10) / 10,
    },
    source: "openfoodfacts",
  };
}

export type LookupResult =
  | { ok: true; product: FoodProduct; via: "openfoodfacts" | "mock" }
  | { ok: false; error: string; via?: "mock" };

export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  const normalized = barcode.replace(/\D/g, "");
  if (normalized.length < 8) {
    return { ok: false, error: "Enter a barcode with at least 8 digits." };
  }

  const mock = findMockProduct(normalized) ?? findMockProduct(barcode.trim());

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${normalized}.json`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "EchelonApp/0.1 (coaching nutrition MVP; local demo)",
        },
        next: { revalidate: 3600 },
      },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      if (mock) return { ok: true, product: mock, via: "mock" };
      return {
        ok: false,
        error: `Open Food Facts returned ${response.status}. Try a demo barcode.`,
      };
    }

    const data = (await response.json()) as OffResponse;
    if (data.status === 1 && data.product) {
      return {
        ok: true,
        product: fromOpenFoodFacts(normalized, data.product),
        via: "openfoodfacts",
      };
    }

    if (mock) return { ok: true, product: mock, via: "mock" };
    return {
      ok: false,
      error: "No product found for that barcode. Try a demo code below.",
    };
  } catch {
    if (mock) return { ok: true, product: mock, via: "mock" };
    return {
      ok: false,
      error:
        "Lookup unavailable (offline or blocked). Use a demo barcode from the mock catalog.",
      via: "mock",
    };
  }
}
