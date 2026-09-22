import { z } from "zod";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  PRODUCT_AVAILABILITIES,
} from "@/types/product";
import { SELL_DEVICE_CATEGORIES, SELL_DEVICE_CONDITIONS, SELL_REQUEST_STATUSES } from "@/types/sellRequest";
import { REMOVE_STOCK_REASONS } from "@/types/inventory";

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Product name is required.").max(200),
  category: z.enum(PRODUCT_CATEGORIES as [string, ...string[]], {
    message: "A valid category is required.",
  }),
  price: z.coerce.number().positive("Price must be greater than zero."),
  currency: z.string().trim().min(1).max(10).default("ETB"),
  condition: z.enum(PRODUCT_CONDITIONS as [string, ...string[]], {
    message: "A valid condition is required.",
  }),
  description: z.string().trim().max(4000).default(""),
  availability: z.enum(PRODUCT_AVAILABILITIES as [string, ...string[]]).default("Available"),
  featured: z.boolean().default(false),
  publish_target: z.enum(["channel", "group", "both"]).nullable().optional(),
  images: z
    .array(
      z.object({
        telegram_file_id: z.string().nullable().optional(),
        image_url: z.string().min(1, "Image URL is required."),
      })
    )
    .default([]),
  specifications: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Specification name is required."),
        value: z.string().trim().min(1, "Specification value is required."),
      })
    )
    .default([]),
});

// Deliberately NOT `productInputSchema.partial()`: several fields carry
// `.default(...)`, which zod applies even when the key is entirely absent
// from the input. For `images`/`specifications` that would turn "the admin
// didn't touch this field" into `[]`, and the PATCH route treats a present
// (even empty) array as "replace all images/specs" — silently wiping them
// on any update that omits the key. Defining this schema independently,
// with plain `.optional()` and no defaults, keeps "omitted" and "explicitly
// emptied" distinguishable.
export const productUpdateSchema = z.object({
  name: z.string().trim().min(1, "Product name is required.").max(200).optional(),
  category: z
    .enum(PRODUCT_CATEGORIES as [string, ...string[]], { message: "A valid category is required." })
    .optional(),
  price: z.coerce.number().positive("Price must be greater than zero.").optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  condition: z
    .enum(PRODUCT_CONDITIONS as [string, ...string[]], { message: "A valid condition is required." })
    .optional(),
  description: z.string().trim().max(4000).optional(),
  availability: z.enum(PRODUCT_AVAILABILITIES as [string, ...string[]]).optional(),
  featured: z.boolean().optional(),
  publish_target: z.enum(["channel", "group", "both"]).nullable().optional(),
  images: z
    .array(
      z.object({
        telegram_file_id: z.string().nullable().optional(),
        image_url: z.string().min(1, "Image URL is required."),
      })
    )
    .optional(),
  specifications: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Specification name is required."),
        value: z.string().trim().min(1, "Specification value is required."),
      })
    )
    .optional(),
});

export const orderInputSchema = z.object({
  product_id: z.string().uuid("A valid product ID is required."),
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero."),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const orderStatusSchema = z.object({
  status: z.enum(["Pending", "Confirmed", "Completed", "Cancelled"]),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const requestInputSchema = z.object({
  product_id: z.string().uuid("A valid product ID is required."),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const requestStatusSchema = z.object({
  status: z.enum(["Pending", "Contacted", "Completed", "Sold", "Unavailable"]),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const settingsUpdateSchema = z.object({
  store_name: z.string().trim().min(1).max(200).optional(),
  store_description: z.string().trim().max(2000).optional(),
  telegram_channel: z.string().trim().max(200).nullable().optional(),
  telegram_group: z.string().trim().max(200).nullable().optional(),
  telegram_group_title: z.string().trim().max(200).nullable().optional(),
  telegram_group_thread_id: z.string().trim().max(100).nullable().optional(),
  publish_target: z.enum(["channel", "group", "both"]).optional(),
  contact_phone: z.string().trim().max(100).nullable().optional(),
  contact_email: z.string().trim().max(200).nullable().optional(),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

// ============================================================
// Sell Device
// ============================================================

export const sellRequestInputSchema = z.object({
  category: z.enum(SELL_DEVICE_CATEGORIES as [string, ...string[]], {
    message: "A valid device category is required.",
  }),
  brand: z.string().trim().min(1, "Brand is required.").max(100),
  model: z.string().trim().min(1, "Model name is required.").max(200),
  product_name: z.string().trim().max(200).optional(),
  condition: z.enum(SELL_DEVICE_CONDITIONS as [string, ...string[]], {
    message: "A valid condition is required.",
  }),
  condition_description: z.string().trim().max(2000).default(""),
  expected_price: z.coerce.number().positive("Expected price must be greater than zero."),
  currency: z.string().trim().min(1).max(10).default("ETB"),
  price_negotiable: z.boolean().default(false),
  specifications: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Specification name is required."),
        value: z.string().trim().min(1, "Specification value is required."),
      })
    )
    .default([]),
  images: z
    .array(
      z.object({
        telegram_file_id: z.string().nullable().optional(),
        image_url: z.string().min(1, "Image URL is required."),
      })
    )
    .min(1, "At least one device photo is required."),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const sellRequestUpdateSchema = z.object({
  status: z.enum(SELL_REQUEST_STATUSES as [string, ...string[]]).optional(),
  admin_notes: z.string().trim().max(2000).nullable().optional(),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const sellOfferInputSchema = z.object({
  offer_price: z.coerce.number().positive("Offer price must be greater than zero."),
  message: z.string().trim().max(1000).optional(),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const initDataOnlySchema = z.object({
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

// ============================================================
// Inventory
// ============================================================

export const inventoryCreateSchema = z.object({
  sku: z.string().trim().max(100).nullable().optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  minimum_stock_level: z.coerce.number().int().min(0).default(0),
  cost_price: z.coerce.number().min(0).nullable().optional(),
  selling_price: z.coerce.number().min(0).nullable().optional(),
  supplier: z.string().trim().max(200).nullable().optional(),
  storage_location: z.string().trim().max(200).nullable().optional(),
  purchase_date: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const inventoryUpdateSchema = z.object({
  sku: z.string().trim().max(100).nullable().optional(),
  minimum_stock_level: z.coerce.number().int().min(0).optional(),
  cost_price: z.coerce.number().min(0).nullable().optional(),
  selling_price: z.coerce.number().min(0).nullable().optional(),
  supplier: z.string().trim().max(200).nullable().optional(),
  storage_location: z.string().trim().max(200).nullable().optional(),
  purchase_date: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const addStockSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity to add must be greater than zero."),
  cost_price: z.coerce.number().min(0).nullable().optional(),
  supplier: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const removeStockSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero."),
  reason: z.enum(REMOVE_STOCK_REASONS as [string, ...string[]], {
    message: "A valid reason is required.",
  }),
  notes: z.string().trim().max(2000).nullable().optional(),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export const adjustStockSchema = z.object({
  new_quantity: z.coerce.number().int().min(0, "New quantity cannot be negative."),
  reason: z.string().trim().min(1, "A reason is required.").max(500),
  notes: z.string().trim().max(2000).nullable().optional(),
  init_data: z.string().min(1, "Telegram authentication data is required."),
});

export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  return first ? first.message : "Invalid input.";
}
