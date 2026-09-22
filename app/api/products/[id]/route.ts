import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { productUpdateSchema, formatZodError } from "@/lib/validation";
import { publishProductById, deleteChannelPost, deleteAllProductPosts } from "@/lib/channelPublisher";
import { apiError, apiSuccess } from "@/lib/utils";
import type { Product } from "@/types/product";

const PRODUCT_SELECT = "*, images:product_images(*), specifications:product_specifications(*)";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));
  const isAdmin = Boolean(verifyAdminInitData(initData));

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .single();

    if (error || !data) {
      return apiError("Product not found.", 404);
    }

    if (!isAdmin && data.availability === "Unavailable") {
      return apiError("Product not found.", 404);
    }

    return apiSuccess({ product: data });
  } catch (error) {
    console.error(`GET /api/products/${id} failed:`, error);
    return apiError("Unable to load product right now.", 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  const input = parsed.data;
  const supabase = getSupabaseAdmin();

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return apiError("Product not found.", 404);
    }

    const updatePayload: Record<string, unknown> = {};
    for (const key of [
      "name",
      "category",
      "price",
      "currency",
      "condition",
      "description",
      "availability",
      "featured",
      "publish_target",
    ] as const) {
      if (input[key] !== undefined) updatePayload[key] = input[key];
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from("products")
        .update(updatePayload)
        .eq("id", id);
      if (updateError) throw updateError;
    }

    if (input.images) {
      await supabase.from("product_images").delete().eq("product_id", id);
      if (input.images.length > 0) {
        const { error: imagesError } = await supabase.from("product_images").insert(
          input.images.map((image, index) => ({
            product_id: id,
            telegram_file_id: image.telegram_file_id ?? null,
            image_url: image.image_url,
            display_order: index,
          }))
        );
        if (imagesError) throw imagesError;
      }
    }

    if (input.specifications) {
      await supabase.from("product_specifications").delete().eq("product_id", id);
      if (input.specifications.length > 0) {
        const { error: specsError } = await supabase.from("product_specifications").insert(
          input.specifications.map((spec, index) => ({
            product_id: id,
            label: spec.label,
            value: spec.value,
            display_order: index,
          }))
        );
        if (specsError) throw specsError;
      }
    }

    let channelWarning: string | null = null;
    let finalProduct = existing;

    if (existing.channel_published || existing.group_published) {
      try {
        const result = await publishProductById(id);
        finalProduct = result.product;
        if (result.warning) {
          channelWarning = result.warning;
          console.error("Publish update warning:", result.warning);
        }
      } catch (publishError) {
        channelWarning = "Product updated, but Telegram posts could not be refreshed.";
        console.error("Publish update threw:", publishError);
      }
    }

    const { data: refetched } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .single();

    return apiSuccess({ product: refetched ?? finalProduct, channelWarning });
  } catch (error) {
    console.error(`PATCH /api/products/${id} failed:`, error);
    return apiError("Unable to update product right now.", 500);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const removeChannelPost = searchParams.get("remove_channel_post") === "true";

  const initData = extractInitData(request, searchParams.get("init_data"));
  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: existing } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .single();

    if (existing && removeChannelPost) {
      try {
        await deleteAllProductPosts(existing as Product);
      } catch (delError) {
        console.error("Failed to delete Telegram posts, continuing with product delete:", delError);
      }
    }

    // Delete dependent tables explicitly first to ensure clean deletion under all DB constraints
    try { await supabase.from("product_images").delete().eq("product_id", id); } catch {}
    try { await supabase.from("product_specifications").delete().eq("product_id", id); } catch {}
    try { await supabase.from("inventory_transactions").delete().eq("product_id", id); } catch {}
    try { await supabase.from("inventory").delete().eq("product_id", id); } catch {}
    try { await supabase.from("orders").delete().eq("product_id", id); } catch {}
    try { await supabase.from("product_requests").delete().eq("product_id", id); } catch {}

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;

    return apiSuccess({ success: true });
  } catch (error) {
    console.error(`DELETE /api/products/${id} failed:`, error);
    return apiError("Unable to delete product right now.", 500);
  }
}
