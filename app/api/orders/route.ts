import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyTelegramInitData, verifyTenantAdmin, extractInitData } from "@/lib/telegramAuth";
import { apiError, apiSuccess, getCustomerDisplayName } from "@/lib/utils";
import { getInventoryByProduct } from "@/lib/inventoryService";
import { notifyTenantStaffOfOrder } from "@/lib/orderNotification";
import { getTenantBySlug } from "@/lib/tenant";

const ORDER_SELECT = `
  *,
  product:products(id, name, price, currency, image_file_ids, tenant:tenants(id, slug, name))
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));
  const status = searchParams.get("status");
  const tenantSlug = searchParams.get("tenant") || searchParams.get("shop");
  const tenantIdParam = searchParams.get("tenant_id");

  // Check if caller is vendor admin
  const tenantAuth = await verifyTenantAdmin(initData, tenantIdParam || tenantSlug, "staff");
  const verifiedCustomer = tenantAuth ? null : verifyTelegramInitData(initData);

  if (!tenantAuth && !verifiedCustomer) {
    return apiError("Unauthorized", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });

    if (tenantAuth && tenantAuth.tenant) {
      // Vendor sees their own store orders
      query = query.eq("tenant_id", tenantAuth.tenant.id);
    } else if (verifiedCustomer) {
      // Customer sees only orders they placed
      query = query.eq("telegram_user_id", String(verifiedCustomer.user.id));
      if (tenantSlug) {
        const tenant = await getTenantBySlug(tenantSlug);
        if (tenant) query = query.eq("tenant_id", tenant.id);
      }
    }

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess({ orders: data ?? [] });
  } catch (error) {
    console.error("GET /api/orders failed:", error);
    return apiError("Unable to load orders right now.", 500);
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const verified = verifyTelegramInitData(initData);
  if (!verified) {
    return apiError("Unauthorized", 401);
  }

  const productId = typeof body.product_id === "string" ? body.product_id : "";
  const quantity = Number(body.quantity) || 1;
  const customerPhone = typeof body.customer_phone === "string" ? body.customer_phone.trim() : null;
  const deliveryAddress = typeof body.delivery_address === "string" ? body.delivery_address.trim() : null;

  if (!productId || quantity < 1) {
    return apiError("Product ID and quantity are required.", 400);
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, tenant_id, name, price, currency, availability")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return apiError("Product not found.", 404);
    }

    if (["Sold", "Unavailable", "Out of Stock"].includes(product.availability)) {
      return apiError("This product is not currently available to order.", 409);
    }

    // Inventory check
    const inventory = await getInventoryByProduct(product.id, product.tenant_id);
    if (inventory && quantity > inventory.quantity) {
      return apiError(
        inventory.quantity > 0
          ? `Only ${inventory.quantity} unit(s) are currently in stock.`
          : "This product is out of stock.",
        409
      );
    }

    const totalPrice = Number(product.price) * quantity;
    const customerName = getCustomerDisplayName(verified.user);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: product.tenant_id,
        product_id: product.id,
        telegram_user_id: String(verified.user.id),
        customer_name: customerName,
        username: verified.user.username ?? null,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        quantity,
        total_price: totalPrice,
        status: "Pending",
      })
      .select(ORDER_SELECT)
      .single();

    if (orderError || !order) {
      throw orderError ?? new Error("Order creation failed");
    }

    // Notify all owners/managers of this specific store via Telegram
    await notifyTenantStaffOfOrder({
      orderId: order.id,
      tenantId: product.tenant_id,
      customerName,
      customerPhone,
      username: verified.user.username ?? null,
      productName: product.name,
      quantity,
      totalPrice,
      currency: product.currency,
    });

    return apiSuccess({ order }, 201);
  } catch (error: any) {
    console.error("POST /api/orders failed:", error);
    return apiError("Unable to place order right now.", 500);
  }
}