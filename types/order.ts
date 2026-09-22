export type OrderStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

export interface Order {
  id: string;
  product_id: string;
  telegram_user_id: string;
  customer_name: string;
  username: string | null;
  quantity: number;
  total_price: number;
  status: OrderStatus;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    currency: string;
  };
}

export interface OrderInput {
  tenant_id?: string;
  product_id: string;
  quantity: number;
  init_data: string;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];
