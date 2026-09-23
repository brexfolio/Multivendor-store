"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PackageX, WifiOff } from "lucide-react";
import Header from "@/components/store/Header";
import EmptyState from "@/components/ui/EmptyState";
import { LoadingPage } from "@/components/ui/Loading";
import { apiGet } from "@/lib/apiClient";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Order } from "@/types/order";

export default function ShopOrdersPage() {
  const params = useParams<{ shopSlug: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!params.shopSlug) return;
    setIsLoading(true);

    apiGet<{ orders: Order[] }>(`/api/orders?shop=${params.shopSlug}`)
      .then((data) => setOrders(data.orders || []))
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  }, [params.shopSlug]);

  return (
    <div className="store-shell">
      <Header />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 16 }}>
        <Link href={`/s/${params.shopSlug}`} style={{ color: "#94a3b8", display: "inline-flex" }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#fff" }}>
          My Orders at this Shop
        </h1>
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : hasError ? (
        <EmptyState
          icon={<WifiOff size={26} />}
          title="Failed to load orders"
          description="Could not load your orders. Please try again."
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<PackageX size={26} />}
          title="No orders yet"
          description="You haven't placed any orders at this store yet."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "#161b26",
                borderRadius: 14,
                padding: 14,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>
                  {order.product?.name || "Ordered Product"}
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background:
                      order.status === "Completed"
                        ? "rgba(16, 185, 129, 0.15)"
                        : order.status === "Confirmed"
                        ? "rgba(59, 130, 246, 0.15)"
                        : order.status === "Cancelled"
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(245, 158, 11, 0.15)",
                    color:
                      order.status === "Completed"
                        ? "#34d399"
                        : order.status === "Confirmed"
                        ? "#60a5fa"
                        : order.status === "Cancelled"
                        ? "#f87171"
                        : "#fbbf24",
                  }}
                >
                  {order.status}
                </span>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#94a3b8" }}>
                Quantity: <strong style={{ color: "#fff" }}>{order.quantity}</strong>
              </p>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#94a3b8" }}>
                Total: <strong style={{ color: "#38bdf8" }}>{formatPrice(order.total_price, order.product?.currency ?? "ETB")}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
                {formatDate(order.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}