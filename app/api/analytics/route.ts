import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));

  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  try {
    const supabase = getSupabaseAdmin();

    const [
      totalProducts,
      availableProducts,
      soldProducts,
      totalOrders,
      pendingOrders,
      productRequests,
      sellRequests,
      inventoryRows,
    ] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("availability", "Available"),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("availability", "Sold"),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "Pending"),
      supabase.from("product_requests").select("id", { count: "exact", head: true }),
      supabase.from("sell_requests").select("id", { count: "exact", head: true }).in("status", ["Pending", "Under Review"]),
      supabase.from("inventory").select("quantity, minimum_stock_level, cost_price"),
    ]);

    const inventory = inventoryRows.data ?? [];
    const totalUnitsInStock = inventory.reduce((sum, row) => sum + row.quantity, 0);
    const lowStockProducts = inventory.filter((row) => row.quantity > 0 && row.quantity <= row.minimum_stock_level).length;
    const outOfStockProducts = inventory.filter((row) => row.quantity <= 0).length;
    const inventoryValue = inventory.reduce((sum, row) => sum + row.quantity * Number(row.cost_price ?? 0), 0);

    return apiSuccess({
      totalProducts: totalProducts.count ?? 0,
      availableProducts: availableProducts.count ?? 0,
      soldProducts: soldProducts.count ?? 0,
      totalOrders: totalOrders.count ?? 0,
      pendingOrders: pendingOrders.count ?? 0,
      productRequests: productRequests.count ?? 0,
      pendingSellRequests: sellRequests.count ?? 0,
      totalUnitsInStock,
      lowStockProducts,
      outOfStockProducts,
      inventoryValue,
    });
  } catch (error) {
    console.error("GET /api/analytics failed:", error);
    return apiError("Unable to load analytics right now.", 500);
  }
}
