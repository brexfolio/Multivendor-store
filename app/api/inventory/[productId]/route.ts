import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { inventoryUpdateSchema, formatZodError } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/utils";

const INVENTORY_SELECT =
  "*, product:products(id, name, category, price, currency, availability, images:product_images(image_url, display_order))";

type RouteContext = { params: Promise<{ productId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { productId } = await params;
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
      .eq("product_id", productId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return apiError("This product does not have an inventory record.", 404);

    return apiSuccess({ inventory: data });
  } catch (error) {
    console.error(`GET /api/inventory/${productId} failed:`, error);
    return apiError("Unable to load inventory right now.", 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { productId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = inventoryUpdateSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  if (!verifyAdminInitData(parsed.data.init_data)) {
    return apiError("Unauthorized", 401);
  }

  const updatePayload: Record<string, unknown> = {};
  for (const key of [
    "sku",
    "minimum_stock_level",
    "cost_price",
    "selling_price",
    "supplier",
    "storage_location",
    "purchase_date",
    "notes",
  ] as const) {
    if (parsed.data[key] !== undefined) updatePayload[key] = parsed.data[key];
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("inventory")
      .update(updatePayload)
      .eq("product_id", productId)
      .select(INVENTORY_SELECT)
      .single();

    if (error || !data) {
      return apiError("This product does not have an inventory record.", 404);
    }

    return apiSuccess({ inventory: data });
  } catch (error) {
    console.error(`PATCH /api/inventory/${productId} failed:`, error);
    return apiError("Unable to update inventory right now.", 500);
  }
}
