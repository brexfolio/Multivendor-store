import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { settingsUpdateSchema, formatZodError } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
    if (error) throw error;

    return apiSuccess({ settings: data });
  } catch (error) {
    console.error("GET /api/settings failed:", error);
    return apiError("Unable to load store settings right now.", 500);
  }
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = settingsUpdateSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  if (!verifyAdminInitData(parsed.data.init_data)) {
    return apiError("Unauthorized", 401);
  }

  const { init_data: _initData, ...updates } = parsed.data;
  void _initData;

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase.from("store_settings").select("id").limit(1).maybeSingle();

    if (!existing) {
      const { data, error } = await supabase.from("store_settings").insert(updates).select("*").single();
      if (error) throw error;
      return apiSuccess({ settings: data });
    }

    const { data, error } = await supabase
      .from("store_settings")
      .update(updates)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;

    return apiSuccess({ settings: data });
  } catch (error) {
    console.error("PATCH /api/settings failed:", error);
    return apiError("Unable to update store settings right now.", 500);
  }
}
