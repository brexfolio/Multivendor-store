import type { SellDeviceCategory } from "@/types/sellRequest";

/**
 * Predefined specification fields shown per device category on the
 * Sell Device form (Step 3). Categories not listed here (Smart
 * Watch, Gaming Device, Accessory, Other) fall back to free-form
 * label/value rows the customer can add and remove.
 */
export const CATEGORY_SPEC_FIELDS: Partial<Record<SellDeviceCategory, string[]>> = {
  Smartphone: [
    "Storage",
    "RAM",
    "Battery Health Percentage",
    "Screen Condition",
    "Body Condition",
    "Camera Condition",
    "Face ID / Fingerprint Working",
    "Network / SIM Working",
    "Charging Working",
    "Accessories Included",
  ],
  Laptop: [
    "Processor",
    "RAM",
    "Storage",
    "Graphics",
    "Screen Size",
    "Battery Condition",
    "Keyboard Condition",
    "Charger Included",
    "Operating System",
  ],
  Tablet: ["Storage", "RAM", "Screen Condition", "Battery Condition", "Accessories Included"],
};

export function hasPredefinedSpecs(category: SellDeviceCategory): boolean {
  return category in CATEGORY_SPEC_FIELDS;
}
