import type { PublishTarget } from "./settings";
import type { Tenant } from "./tenant";

export type ProductCategory =
  | "Smartphones"
  | "Laptops"
  | "Tablets"
  | "Accessories"
  | "Smart Watches"
  | "Gaming"
  | "Clothing"
  | "Footwear"
  | "Furniture"
  | "Vehicles"
  | "Food"
  | "Beauty"
  | "Home Materials"
  | "Books"
  | "Other"
  | string;

export type ProductCondition = "Brand New" | "Like New" | "Used" | "Refurbished";

export type ProductAvailability =
  | "Available"
  | "Low Stock"
  | "Sold"
  | "Unavailable"
  | "Out of Stock";

export interface ProductImage {
  id: string;
  product_id: string;
  telegram_file_id: string | null;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface ProductSpecification {
  id: string;
  product_id: string;
  label: string;
  value: string;
  display_order: number;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  category: ProductCategory;
  price: number;
  currency: string;
  condition: ProductCondition;
  description: string;
  availability: ProductAvailability;
  featured: boolean;
  metadata: Record<string, unknown>;
  image_file_ids: string[];
  channel_published: boolean;
  telegram_channel_id: string | null;
  telegram_channel_message_id: string | null;
  telegram_channel_media_message_ids: string[] | null;
  channel_published_at: string | null;
  group_published?: boolean;
  telegram_group_id?: string | null;
  telegram_group_message_id?: string | null;
  telegram_group_media_message_ids?: string[] | null;
  telegram_group_thread_id?: string | null;
  group_published_at?: string | null;
  publish_target?: PublishTarget | null;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  specifications?: ProductSpecification[];
  tenant?: Tenant;
}

export interface ProductInput {
  tenant_id?: string;
  name: string;
  category: ProductCategory;
  price: number;
  currency?: string;
  condition?: ProductCondition;
  description?: string;
  availability?: ProductAvailability;
  featured?: boolean;
  metadata?: Record<string, unknown>;
  image_file_ids?: string[];
  publish_target?: PublishTarget | null;
  images?: { telegram_file_id?: string | null; image_url: string }[];
  specifications?: { label: string; value: string }[];
}

export const PRODUCT_CONDITIONS: ProductCondition[] = [
  "Brand New",
  "Like New",
  "Used",
  "Refurbished",
];

export const PRODUCT_AVAILABILITIES: ProductAvailability[] = [
  "Available",
  "Low Stock",
  "Sold",
  "Unavailable",
  "Out of Stock",
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Smartphones",
  "Laptops",
  "Tablets",
  "Accessories",
  "Smart Watches",
  "Gaming",
  "Clothing",
  "Footwear",
  "Furniture",
  "Vehicles",
  "Food",
  "Beauty",
  "Home Materials",
  "Books",
  "Other",
];