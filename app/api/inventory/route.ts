import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { inventoryCreateSchema, formatZodError } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/utils";

const INVENTORY_SELECT =
  "*, product:products(id, name, category, price, currency, availability, images:product_images(image_url, display_order))";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));

  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("inventory")
      .select(INVENTORY_SELECT)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return apiSuccess({ inventory: data ?? [] });
  } catch (error) {
    console.error("GET /api/inventory failed:", error);
    return apiError("Unable to load inventory right now.", 500);
  }
}

/** Creates the initial inventory record for a product (admin sets it up once). */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const productId = typeof body.product_id === "string" ? body.product_id : null;
  if (!productId) {
    return apiError("product_id is required.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = inventoryCreateSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  if (!verifyAdminInitData(parsed.data.init_data)) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return apiError("Product not found.", 404);
    }

    const { data: existing } = await supabase
      .from("inventory")
      .select("id")
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      return apiError("This product already has an inventory record.", 409);
    }

    const { data: created, error: insertError } = await supabase
      .from("inventory")
      .insert({
        product_id: productId,
        sku: parsed.data.sku ?? null,
        quantity: parsed.data.quantity,
        minimum_stock_level: parsed.data.minimum_stock_level,
        cost_price: parsed.data.cost_price ?? null,
        selling_price: parsed.data.selling_price ?? null,
        supplier: parsed.data.supplier ?? null,
        storage_location: parsed.data.storage_location ?? null,
        purchase_date: parsed.data.purchase_date ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select(INVENTORY_SELECT)
      .single();

    if (insertError || !created) throw insertError ?? new Error("Insert failed.");

    if (parsed.data.quantity > 0) {
      await supabase.from("inventory_transactions").insert({
        inventory_id: created.id,
        product_id: productId,
        transaction_type: "Stock Added",
        quantity_change: parsed.data.quantity,
        previous_quantity: 0,
        new_quantity: parsed.data.quantity,
        reason: "Initial stock",
        notes: parsed.data.notes ?? null,
      });
    }

    return apiSuccess({ inventory: created }, 201);
  } catch (error) {
    console.error("POST /api/inventory failed:", error);
    return apiError("Unable to create inventory record right now.", 500);
  }
}
