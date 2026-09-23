export type ShopType =
  | "electronics"
  | "clothing"
  | "furniture"
  | "home_materials"
  | "vehicles"
  | "food"
  | "beauty"
  | "books"
  | "other";

export type ShopLayout = "grid" | "large_card" | "detail_card" | "compact";

export interface ShopTypeConfig {
  label: string;
  icon: string;
  productFields: string[];
  filters: string[];
  layout: ShopLayout;
  listingLabel: string;
  description: string;
}

export const SHOP_TYPE_CONFIGS: Record<ShopType, ShopTypeConfig> = {
  electronics: {
    label: "Electronics & Gadgets",
    icon: "📱",
    productFields: ["brand", "model", "specs", "warranty", "condition"],
    filters: ["brand", "condition", "price_range"],
    layout: "grid",
    listingLabel: "Device",
    description: "Smartphones, laptops, tablets, computers, and smart accessories",
  },
  clothing: {
    label: "Fashion & Clothing",
    icon: "👗",
    productFields: ["size", "color", "material", "gender", "brand"],
    filters: ["size", "color", "gender", "price_range"],
    layout: "grid",
    listingLabel: "Item",
    description: "Apparel, footwear, streetwear, sportswear, and fashion accessories",
  },
  furniture: {
    label: "Furniture & Decor",
    icon: "🪑",
    productFields: ["dimensions", "material", "color", "assembly_required"],
    filters: ["material", "room_type", "price_range"],
    layout: "large_card",
    listingLabel: "Piece",
    description: "Living room, office, bedroom, kitchen, and interior decor",
  },
  vehicles: {
    label: "Cars & Vehicles",
    icon: "🚗",
    productFields: ["make", "model", "year", "mileage", "fuel_type", "transmission", "color"],
    filters: ["make", "year", "fuel_type", "price_range"],
    layout: "detail_card",
    listingLabel: "Vehicle",
    description: "Sedans, SUVs, motorcycles, auto spare parts, and accessories",
  },
  food: {
    label: "Food & Grocery",
    icon: "🛒",
    productFields: ["weight", "expiry_date", "ingredients", "halal_certified"],
    filters: ["category", "dietary", "price_range"],
    layout: "compact",
    listingLabel: "Product",
    description: "Packaged foods, spices, coffee, fresh produce, and gourmet treats",
  },
  home_materials: {
    label: "Home Materials",
    icon: "🏠",
    productFields: ["brand", "material", "dimensions", "unit"],
    filters: ["material", "price_range"],
    layout: "grid",
    listingLabel: "Item",
    description: "Hardware, tiles, plumbing, electrical fixtures, and tools",
  },
  beauty: {
    label: "Beauty & Skincare",
    icon: "💄",
    productFields: ["brand", "skin_type", "ingredients", "volume"],
    filters: ["brand", "skin_type", "price_range"],
    layout: "grid",
    listingLabel: "Product",
    description: "Cosmetics, perfumes, skincare, hair care, and wellness items",
  },
  books: {
    label: "Books & Stationery",
    icon: "📚",
    productFields: ["author", "publisher", "isbn", "language", "pages"],
    filters: ["language", "price_range"],
    layout: "compact",
    listingLabel: "Book",
    description: "Novels, textbooks, religious books, stationery, and art supplies",
  },
  other: {
    label: "General Shop",
    icon: "🏪",
    productFields: ["brand", "condition", "specs"],
    filters: ["price_range"],
    layout: "grid",
    listingLabel: "Product",
    description: "Multi-purpose retail goods, gifts, hobby supplies, and sundries",
  },
};

export const ALL_SHOP_TYPES: ShopType[] = [
  "electronics",
  "clothing",
  "furniture",
  "vehicles",
  "food",
  "beauty",
  "home_materials",
  "books",
  "other",
];

export function getShopTypeConfig(shopType?: string | null): ShopTypeConfig {
  if (shopType && shopType in SHOP_TYPE_CONFIGS) {
    return SHOP_TYPE_CONFIGS[shopType as ShopType];
  }
  return SHOP_TYPE_CONFIGS.other;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  options?: string[];
  placeholder?: string;
}

export const FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  brand: { name: "brand", label: "Brand / Manufacturer", type: "text", placeholder: "e.g. Nike, Apple, Toyota" },
  model: { name: "model", label: "Model / Series", type: "text", placeholder: "e.g. Air Max, iPhone 15, Corolla" },
  make: { name: "make", label: "Make / Manufacturer", type: "text", placeholder: "e.g. Toyota, Hyundai, Ford" },
  year: { name: "year", label: "Year of Manufacture", type: "number", placeholder: "e.g. 2022" },
  mileage: { name: "mileage", label: "Mileage (km)", type: "number", placeholder: "e.g. 45000" },
  fuel_type: { name: "fuel_type", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric"] },
  transmission: { name: "transmission", label: "Transmission", type: "select", options: ["Automatic", "Manual"] },
  size: { name: "size", label: "Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL", "Free Size"] },
  color: { name: "color", label: "Color", type: "text", placeholder: "e.g. Black, Navy Blue, Silver" },
  gender: { name: "gender", label: "Target Audience", type: "select", options: ["Men", "Women", "Unisex", "Kids"] },
  material: { name: "material", label: "Material", type: "text", placeholder: "e.g. 100% Cotton, Solid Oak, Steel" },
  dimensions: { name: "dimensions", label: "Dimensions", type: "text", placeholder: "e.g. 120 x 60 x 75 cm" },
  assembly_required: { name: "assembly_required", label: "Assembly Required", type: "select", options: ["No", "Yes", "Partial"] },
  weight: { name: "weight", label: "Weight / Net Content", type: "text", placeholder: "e.g. 500g, 1kg, 250ml" },
  volume: { name: "volume", label: "Volume / Capacity", type: "text", placeholder: "e.g. 50ml, 100ml, 300ml" },
  skin_type: { name: "skin_type", label: "Skin Type", type: "select", options: ["All Skin Types", "Dry", "Oily", "Combination", "Sensitive"] },
  expiry_date: { name: "expiry_date", label: "Expiry Date", type: "text", placeholder: "e.g. MM/YYYY or 12 Months" },
  halal_certified: { name: "halal_certified", label: "Halal / Organic Certified", type: "select", options: ["Yes", "No", "N/A"] },
  author: { name: "author", label: "Author / Creator", type: "text", placeholder: "e.g. Chinua Achebe, Dr. Haddis Alemayehu" },
  publisher: { name: "publisher", label: "Publisher", type: "text", placeholder: "e.g. Addis Ababa University Press" },
  isbn: { name: "isbn", label: "ISBN / Catalog Number", type: "text", placeholder: "Optional ISBN code" },
  language: { name: "language", label: "Language", type: "select", options: ["Amharic", "English", "Oromo", "Tigrinya", "French", "Arabic", "Other"] },
  pages: { name: "pages", label: "Number of Pages", type: "number", placeholder: "e.g. 320" },
  unit: { name: "unit", label: "Unit of Measurement", type: "text", placeholder: "e.g. Piece, Meter, Box, Sq. Meter" },
  warranty: { name: "warranty", label: "Warranty Period", type: "text", placeholder: "e.g. 6 Months, 1 Year, None" },
  specs: { name: "specs", label: "Key Specifications", type: "text", placeholder: "e.g. 8GB RAM / 256GB SSD" },
  condition: { name: "condition", label: "Item Condition", type: "select", options: ["Brand New", "Like New", "Used", "Refurbished"] },
};

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
