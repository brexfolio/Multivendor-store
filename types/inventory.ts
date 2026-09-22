export type InventoryTransactionType =
  | "Stock Added"
  | "Stock Removed"
  | "Sale"
  | "Adjustment"
  | "Return"
  | "Damage";

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface InventoryRecord {
  id: string;
  product_id: string;
  sku: string | null;
  quantity: number;
  minimum_stock_level: number;
  cost_price: number | null;
  selling_price: number | null;
  supplier: string | null;
  storage_location: string | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    category: string;
    price: number;
    currency: string;
    availability: string;
    images?: { image_url: string }[];
  };
}

export interface InventoryTransaction {
  id: string;
  inventory_id: string;
  product_id: string;
  transaction_type: InventoryTransactionType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  notes: string | null;
  related_order_id: string | null;
  admin_telegram_id: string | null;
  created_at: string;
}

export function getStockStatus(quantity: number, minimumStockLevel: number): StockStatus {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= minimumStockLevel) return "Low Stock";
  return "In Stock";
}

export const REMOVE_STOCK_REASONS = ["Sold", "Damaged", "Returned", "Lost", "Personal Use", "Other"];
