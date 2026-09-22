export type SellDeviceCategory =
  | "Smartphone"
  | "Laptop"
  | "Tablet"
  | "Smart Watch"
  | "Gaming Device"
  | "Accessory"
  | "Other";

export type SellDeviceCondition = "Like New" | "Excellent" | "Good" | "Fair" | "Damaged";

export type SellRequestStatus =
  | "Pending"
  | "Under Review"
  | "Offer Sent"
  | "Accepted"
  | "Rejected"
  | "Completed";

export type SellOfferStatus = "Pending" | "Accepted" | "Rejected" | "Cancelled";

export interface SellRequestSpecification {
  id: string;
  sell_request_id: string;
  label: string;
  value: string;
  display_order: number;
  created_at: string;
}

export interface SellRequestImage {
  id: string;
  sell_request_id: string;
  image_url: string;
  telegram_file_id: string | null;
  display_order: number;
  created_at: string;
}

export interface SellOffer {
  id: string;
  sell_request_id: string;
  offer_price: number;
  currency: string;
  message: string | null;
  status: SellOfferStatus;
  created_at: string;
  updated_at: string;
}

export interface SellRequest {
  id: string;
  telegram_user_id: string;
  customer_name: string;
  telegram_username: string | null;
  category: SellDeviceCategory;
  brand: string;
  model: string;
  product_name: string | null;
  condition: SellDeviceCondition;
  condition_description: string;
  expected_price: number;
  currency: string;
  price_negotiable: boolean;
  status: SellRequestStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  specifications?: SellRequestSpecification[];
  images?: SellRequestImage[];
  offers?: SellOffer[];
}

export interface SellRequestInput {
  category: SellDeviceCategory;
  brand: string;
  model: string;
  product_name?: string;
  condition: SellDeviceCondition;
  condition_description: string;
  expected_price: number;
  currency?: string;
  price_negotiable: boolean;
  specifications: { label: string; value: string }[];
  images: { telegram_file_id?: string | null; image_url: string }[];
}

export const SELL_DEVICE_CATEGORIES: SellDeviceCategory[] = [
  "Smartphone",
  "Laptop",
  "Tablet",
  "Smart Watch",
  "Gaming Device",
  "Accessory",
  "Other",
];

export const SELL_DEVICE_CONDITIONS: SellDeviceCondition[] = [
  "Like New",
  "Excellent",
  "Good",
  "Fair",
  "Damaged",
];

export const SELL_REQUEST_STATUSES: SellRequestStatus[] = [
  "Pending",
  "Under Review",
  "Offer Sent",
  "Accepted",
  "Rejected",
  "Completed",
];

export const DEVICE_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Huawei",
  "Lenovo",
  "HP",
  "Dell",
  "Other",
];
