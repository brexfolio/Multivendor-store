import { NextResponse } from "next/server";
import {
  getAllActiveTenants,
  getAllTenantsAdmin,
  getTenantsByOwner,
  createTenant,
  isSlugReserved,
  sanitizeSlug,
} from "@/lib/tenant";
import { verifyTelegramInitData, extractInitData, isPlatformAdmin } from "@/lib/telegramAuth";
import type { ShopType } from "@/lib/shopTypeConfig";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const myStores = searchParams.get("my") === "true";
  const forAdmin = searchParams.get("admin") === "true";

  if (myStores) {
    const initData = extractInitData(request, searchParams.get("init_data"));
    let verified = verifyTelegramInitData(initData);
    if (!verified && process.env.NODE_ENV === "development") {
      verified = {
        user: { id: Number(process.env.ADMIN_TELEGRAM_ID || 1084144032), first_name: "Dev Admin" },
        authDate: Math.floor(Date.now() / 1000),
      };
    }
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stores = await getTenantsByOwner(String(verified.user.id));
    return NextResponse.json({ stores });
  }

  const shopType = searchParams.get("shop_type");
  const search = searchParams.get("search");
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

  if (forAdmin) {
    const initData = extractInitData(request, searchParams.get("init_data"));
    let verified = verifyTelegramInitData(initData);
    if (!verified && process.env.NODE_ENV === "development") {
      verified = {
        user: { id: Number(process.env.ADMIN_TELEGRAM_ID || 1084144032), first_name: "Dev Admin" },
        authDate: Math.floor(Date.now() / 1000),
      };
    }
    if (!verified) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = await isPlatformAdmin(String(verified.user.id));
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden: Super-admin only" }, { status: 403 });
    }

    const status = searchParams.get("status");
    const tenants = await getAllTenantsAdmin({ status, shopType, search, limit });
    return NextResponse.json({ tenants });
  }

  const tenants = await getAllActiveTenants({ shopType, search, limit });
  return NextResponse.json({ tenants });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const verified = verifyTelegramInitData(initData);
  if (!verified) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rawSlug = typeof body.slug === "string" ? body.slug.trim() : name;
  const slug = sanitizeSlug(rawSlug);
  const shopType = (typeof body.shop_type === "string" ? body.shop_type : "other") as ShopType;

  if (!name) {
    return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
  }

  if (!slug || isSlugReserved(slug)) {
    return NextResponse.json({ error: `The shop handle '${slug}' is invalid or reserved` }, { status: 400 });
  }

  try {
    const tenant = await createTenant({
      slug,
      name,
      shop_type: shopType,
      description: typeof body.description === "string" ? body.description.trim() : undefined,
      owner_telegram_id: String(verified.user.id),
      contact_phone: typeof body.contact_phone === "string" ? body.contact_phone.trim() : undefined,
      contact_email: typeof body.contact_email === "string" ? body.contact_email.trim() : undefined,
      support_telegram: typeof body.support_telegram === "string" ? body.support_telegram.trim() : undefined,
      telegram_channel: typeof body.telegram_channel === "string" ? body.telegram_channel.trim() : undefined,
      telegram_group: typeof body.telegram_group === "string" ? body.telegram_group.trim() : undefined,
      telegram_group_thread_id: typeof body.telegram_group_thread_id === "string" ? body.telegram_group_thread_id.trim() : undefined,
      publish_target: (typeof body.publish_target === "string" ? body.publish_target : "channel") as any,
      logo_file_id: typeof body.logo_file_id === "string" ? body.logo_file_id.trim() : null,
      banner_file_id: typeof body.banner_file_id === "string" ? body.banner_file_id.trim() : null,
      currency: typeof body.currency === "string" ? body.currency.trim() : "ETB",
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create shop" }, { status: 400 });
  }
}