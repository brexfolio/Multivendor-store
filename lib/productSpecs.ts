import type { ProductCategory } from "@/types/product";

/**
 * Suggested specification labels shown as quick-add pills on the
 * Add/Edit Product form, per category. Categories not listed here
 * (just "Other") have no suggestions — the admin adds custom rows.
 */
export const CATEGORY_SPEC_FIELDS: Partial<Record<ProductCategory, string[]>> = {
  Smartphones: [
    "Storage",
    "RAM",
    "Screen Size",
    "Battery Capacity",
    "Camera",
    "Processor",
    "Color",
    "Network",
  ],
  Laptops: [
    "Processor",
    "RAM",
    "Storage",
    "Graphics",
    "Screen Size",
    "Operating System",
    "Battery Life",
    "Color",
  ],
  Tablets: ["Storage", "RAM", "Screen Size", "Battery Capacity", "Connectivity", "Color"],
  "Smart Watches": [
    "Case Size",
    "Battery Life",
    "Connectivity",
    "Water Resistance",
    "Compatible With",
    "Color",
  ],
  Gaming: ["Storage", "Included Accessories", "Region", "Controllers Included", "Color"],
  Accessories: ["Compatibility", "Color", "Material", "Connector Type"],
};

export function getSuggestedSpecFields(category: ProductCategory): string[] {
  return CATEGORY_SPEC_FIELDS[category] ?? [];
}
