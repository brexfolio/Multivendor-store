import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { productInputSchema, formatZodError } from "@/lib/validation";
import { publishProductById } from "@/lib/channelPublisher";
import { apiError, apiSuccess } from "@/lib/utils";

const PRODUCT_SELECT = "*, images:product_images(*), specifications:product_specifications(*)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search")?.trim();
  const featured = searchParams.get("featured");
  const sort = searchParams.get("sort");
  const minPrice = searchParams.get("min_price");
  const maxPrice = searchParams.get("max_price");
  const inStock = searchParams.get("in_stock");
  const initData = extractInitData(request, searchParams.get("init_data"));
  const isAdmin = Boolean(verifyAdminInitData(initData));

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT);

    if (sort === "price_asc") {
      query = query.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false });
    } else if (sort === "newest") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
    }

    if (!isAdmin) {
      query = query.neq("availability", "Unavailable");
    }

    if (inStock === "true") {
      query = query.in("availability", ["Available", "Low Stock"]);
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      query = query.gte("price", Number(minPrice));
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      query = query.lte("price", Number(maxPrice));
    }

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    if (featured === "true") {
      query = query.eq("featured", true);
    }

    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        query = query.in("id", ids);
      }
    }

    if (search) {
      let matchingIds: string[] = [];
      const { data: specMatches } = await supabase
        .from("product_specifications")
        .select("product_id")
        .or(`label.ilike.%${search}%,value.ilike.%${search}%`);
      if (specMatches?.length) {
        matchingIds = specMatches.map((row) => row.product_id);
      }

      const textFilter = `name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`;
      const orFilter = matchingIds.length
        ? `${textFilter},id.in.(${matchingIds.join(",")})`
        : textFilter;
      query = query.or(orFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess({ products: data ?? [] });
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return apiError("Unable to load products right now.", 500);
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
  const verifiedAdmin = verifyAdminInitData(initData);
  if (!verifiedAdmin) {
    return apiError("Unauthorized", 401);
  }

  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  const input = parsed.data;
  const supabase = getSupabaseAdmin();

  try {
    const { data: created, error: insertError } = await supabase
      .from("products")
      .insert({
        name: input.name,
        category: input.category,
        price: input.price,
        currency: input.currency,
        condition: input.condition,
        description: input.description,
        availability: input.availability,
        featured: input.featured,
        publish_target: input.publish_target ?? null,
      })
      .select("*")
      .single();

    if (insertError || !created) throw insertError ?? new Error("Insert failed.");

    if (input.images.length > 0) {
      const { error: imagesError } = await supabase.from("product_images").insert(
        input.images.map((image, index) => ({
          product_id: created.id,
          telegram_file_id: image.telegram_file_id ?? null,
          image_url: image.image_url,
          display_order: index,
        }))
      );
      if (imagesError) throw imagesError;
    }

    if (input.specifications.length > 0) {
      const { error: specsError } = await supabase.from("product_specifications").insert(
        input.specifications.map((spec, index) => ({
          product_id: created.id,
          label: spec.label,
          value: spec.value,
          display_order: index,
        }))
      );
      if (specsError) throw specsError;
    }

    let channelWarning: string | null = null;
    let finalProduct = null;
    try {
      const result = await publishProductById(created.id);
      finalProduct = result.product;
      if (result.warning) {
        channelWarning = result.warning;
        console.error("Publish warning:", result.warning);
      }
    } catch (publishError) {
      channelWarning = "Product saved successfully, but failed to publish to Telegram.";
      console.error("Publish threw:", publishError);
      const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", created.id).single();
      finalProduct = data;
    }

    if (!finalProduct) {
      const { data: fallbackProduct } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", created.id).single();
      finalProduct = fallbackProduct;
    }

    return apiSuccess({ product: finalProduct, channelWarning }, 201);
  } catch (error) {
    console.error("POST /api/products failed:", error);
    return apiError("Unable to create product right now.", 500);
  }
}
