import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyTenantAdmin, extractInitData } from "@/lib/telegramAuth";
import { apiError, apiSuccess } from "@/lib/utils";
import { publishProductToChat, resolveStorePublishSettings } from "@/lib/channelPublisher";
import { getTenantBySlug } from "@/lib/tenant";

const PRODUCT_SELECT = `
  *,
  images:product_images(*),
  specifications:product_specifications(*),
  tenant:tenants(id, slug, name, shop_type, logo_file_id)
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const tenantSlug = searchParams.get("tenant") || searchParams.get("shop");
  const tenantIdParam = searchParams.get("tenant_id");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort");
  const inStockOnly = searchParams.get("in_stock") === "true";
  const minPrice = searchParams.get("min_price");
  const maxPrice = searchParams.get("max_price");
  const ids = searchParams.get("ids");
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("products").select(PRODUCT_SELECT);

    // Resolve tenant filter if specified
    if (tenantIdParam) {
      query = query.eq("tenant_id", tenantIdParam);
    } else if (tenantSlug) {
      const tenant = await getTenantBySlug(tenantSlug);
      if (tenant) {
        query = query.eq("tenant_id", tenant.id);
      } else {
        return apiSuccess({ products: [] });
      }
    }

    if (ids) {
      const idList = ids.split(",").map((id) => id.trim()).filter(Boolean);
      query = query.in("id", idList);
    }

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    if (inStockOnly) {
      query = query.in("availability", ["Available", "Low Stock"]);
    }

    if (minPrice) {
      query = query.gte("price", Number(minPrice));
    }

    if (maxPrice) {
      query = query.lte("price", Number(maxPrice));
    }

    if (search && search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    switch (sort) {
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      default:
        query = query.order("featured", { ascending: false }).order("created_at", { ascending: false });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess({ products: data ?? [] });
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return apiError("Unable to load products.", 500);
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
  const targetTenantId = typeof body.tenant_id === "string" ? body.tenant_id : null;

  const auth = await verifyTenantAdmin(initData, targetTenantId, "staff");
  if (!auth || !auth.tenant) {
    return apiError("Unauthorized: You must be staff or owner of this store.", 401);
  }

  const tenant = auth.tenant;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "General";
  const price = Number(body.price);

  if (!name || isNaN(price) || price <= 0) {
    return apiError("Product name and valid price are required.", 400);
  }

  const metadata = (body.metadata && typeof body.metadata === "object") ? body.metadata : {};
  const imageFileIds: string[] = Array.isArray(body.image_file_ids) ? body.image_file_ids : [];

  const supabase = getSupabaseAdmin();

  try {
    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        tenant_id: tenant.id,
        name,
        category,
        price,
        currency: typeof body.currency === "string" ? body.currency : tenant.currency,
        condition: typeof body.condition === "string" ? body.condition : "Brand New",
        description: typeof body.description === "string" ? body.description.trim() : "",
        availability: typeof body.availability === "string" ? body.availability : "Available",
        featured: Boolean(body.featured),
        metadata,
        image_file_ids: imageFileIds,
        publish_target: typeof body.publish_target === "string" ? body.publish_target : tenant.publish_target,
      })
      .select(PRODUCT_SELECT)
      .single();

    if (insertError || !product) {
      throw insertError ?? new Error("Insert failed");
    }

    // Auto-create inventory record if stock provided
    const initialStock = Number(body.quantity);
    if (!isNaN(initialStock) && initialStock >= 0) {
      await supabase.from("inventory").insert({
        tenant_id: tenant.id,
        product_id: product.id,
        quantity: initialStock,
        minimum_stock_level: Number(body.minimum_stock_level) || 2,
        cost_price: body.cost_price ? Number(body.cost_price) : null,
        selling_price: price,
        supplier: typeof body.supplier === "string" ? body.supplier : null,
        storage_location: typeof body.storage_location === "string" ? body.storage_location : null,
      });
    }

    // Attempt channel publishing if configured
    let channelWarning: string | null = null;
    const publishTarget = (product.publish_target || tenant.publish_target);
    if (publishTarget && publishTarget !== "none") {
      try {
        const settings = await resolveStorePublishSettings(tenant.id);
        const targetChat = publishTarget === "group" ? settings.groupId : settings.channelId;
        if (targetChat) {
          const pubResult = await publishProductToChat(
            product,
            targetChat,
            settings.groupThreadId,
            tenant.slug,
            tenant.shop_type
          );
          if (pubResult.success) {
            await supabase
              .from("products")
              .update({
                channel_published: true,
                telegram_channel_id: pubResult.channelId,
                telegram_channel_message_id: pubResult.messageId,
                telegram_channel_media_message_ids: pubResult.mediaMessageIds,
                channel_published_at: new Date().toISOString(),
              })
              .eq("id", product.id);
          } else {
            channelWarning = pubResult.error || "Channel publish failed";
          }
        }
      } catch (pubErr: any) {
        channelWarning = pubErr.message || "Failed to publish to Telegram channel";
      }
    }

    return apiSuccess({ product, channelWarning }, 201);
  } catch (error: any) {
    console.error("POST /api/products failed:", error);
    return apiError(error.message || "Failed to create product.", 500);
  }
}