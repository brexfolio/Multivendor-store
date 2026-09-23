import { NextResponse } from "next/server";
import { getTenantBySlug, getTenantById } from "@/lib/tenant";
import { verifyTenantAdmin, extractInitData } from "@/lib/telegramAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slugOrId: string }> }
) {
  const { slugOrId } = await params;
  const tenant = slugOrId.includes("-") && slugOrId.length === 36
    ? await getTenantById(slugOrId)
    : await getTenantBySlug(slugOrId);

  if (!tenant) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Get active products count
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .neq("availability", "Unavailable");

  return NextResponse.json({ tenant: { ...tenant, productCount: count ?? 0 } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slugOrId: string }> }
) {
  const { slugOrId } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const auth = await verifyTenantAdmin(initData, slugOrId, "owner");
  if (!auth || !auth.tenant) {
    return NextResponse.json({ error: "Unauthorized: You must be an owner of this shop" }, { status: 403 });
  }

  const tenant = auth.tenant;
  const updates: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.description === "string") updates.description = body.description.trim();
  if (typeof body.contact_phone === "string") updates.contact_phone = body.contact_phone.trim();
  if (typeof body.contact_email === "string") updates.contact_email = body.contact_email.trim();
  if (typeof body.support_telegram === "string") updates.support_telegram = body.support_telegram.trim();
  if (typeof body.telegram_channel === "string") updates.telegram_channel = body.telegram_channel.trim();
  if (typeof body.telegram_group === "string") updates.telegram_group = body.telegram_group.trim();
  if (typeof body.telegram_group_title === "string") updates.telegram_group_title = body.telegram_group_title.trim();
  if (typeof body.telegram_group_thread_id === "string") updates.telegram_group_thread_id = body.telegram_group_thread_id.trim();
  if (typeof body.publish_target === "string") updates.publish_target = body.publish_target;
  if (typeof body.logo_file_id === "string") updates.logo_file_id = body.logo_file_id.trim();
  if (typeof body.banner_file_id === "string") updates.banner_file_id = body.banner_file_id.trim();

  const supabase = getSupabaseAdmin();
  const { data: updated, error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("id", tenant.id)
    .select("*")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ tenant: updated });
}