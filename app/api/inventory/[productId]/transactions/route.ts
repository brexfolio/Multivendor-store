import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));

  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return apiSuccess({ transactions: data ?? [] });
  } catch (error) {
    console.error(`GET /api/inventory/${productId}/transactions failed:`, error);
    return apiError("Unable to load inventory history right now.", 500);
  }
}
