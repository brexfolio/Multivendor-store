export type RequestStatus =
  | "Pending"
  | "Contacted"
  | "Completed"
  | "Sold"
  | "Unavailable";

export interface ProductRequest {
  id: string;
  product_id: string;
  telegram_user_id: string;
  customer_name: string;
  username: string | null;
  status: RequestStatus;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    currency: string;
  };
}

export interface RequestInput {
  product_id: string;
  init_data: string;
}

export const REQUEST_STATUSES: RequestStatus[] = [
  "Pending",
  "Contacted",
  "Completed",
  "Sold",
  "Unavailable",
];
