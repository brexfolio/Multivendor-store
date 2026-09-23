import { getSupabaseAdmin } from "./supabase";
import type { Tenant, TenantMember, PlatformAdmin, ShopType } from "@/types/tenant";

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "explore",
  "super-admin",
  "s",
  "me",
  "help",
  "start",
  "static",
  "auth",
  "_next",
  "orders",
  "favorites",
  "settings",
  "sell-device",
  "my-sell-requests",
]);

export function isSlugReserved(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

export function sanitizeSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Retrieves a tenant by their unique slug.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const cleanSlug = slug.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", cleanSlug)
    .maybeSingle();

  if (error || !data) return null;
  return data as Tenant;
}

/**
 * Retrieves a tenant by UUID.
 */
export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Tenant;
}

/**
 * Gets all active tenants for the marketplace directory.
 */
export async function getAllActiveTenants(options?: {
  shopType?: string | null;
  search?: string | null;
  limit?: number;
}): Promise<Tenant[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("tenants")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (options?.shopType && options.shopType !== "all") {
    query = query.eq("shop_type", options.shopType);
  }

  if (options?.search && options.search.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as Tenant[];
}

/**
 * Gets the primary/default tenant (fallback if no tenant slug is supplied).
 */
export async function getDefaultTenant(): Promise<Tenant | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", "habentech")
    .limit(1)
    .maybeSingle();

  if (data) return data as Tenant;

  const { data: firstTenant } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (firstTenant as Tenant) ?? null;
}

/**
 * Returns all stores a Telegram user owns or manages.
 */
export async function getTenantsByOwner(telegramUserId: string): Promise<Array<Tenant & { role: string }>> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("tenant_members")
    .select("role, tenant:tenants(*)")
    .eq("telegram_user_id", telegramUserId);

  if (error || !data) return [];

  return data
    .filter((m) => m.tenant)
    .map((m) => {
      const tenant = Array.isArray(m.tenant) ? m.tenant[0] : m.tenant;
      return {
        ...(tenant as Tenant),
        role: m.role,
      };
    });
}

/**
 * Checks if the given Telegram user ID is a global platform admin.
 */
export async function isPlatformAdmin(telegramUserId: string): Promise<boolean> {
  if (process.env.ADMIN_TELEGRAM_ID && telegramUserId === process.env.ADMIN_TELEGRAM_ID) {
    return true;
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("platform_admins")
    .select("telegram_user_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  return Boolean(data);
}

/**
 * Checks if a user is an active member (owner, manager, staff) of a tenant.
 */
export async function isTenantMember(telegramUserId: string, tenantId: string): Promise<boolean> {
  if (await isPlatformAdmin(telegramUserId)) return true;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tenant_members")
    .select("id")
    .eq("telegram_user_id", telegramUserId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return Boolean(data);
}

/**
 * Checks if a user is the owner of a tenant.
 */
export async function isTenantOwner(telegramUserId: string, tenantId: string): Promise<boolean> {
  if (await isPlatformAdmin(telegramUserId)) return true;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("telegram_user_id", telegramUserId)
    .eq("tenant_id", tenantId)
    .eq("role", "owner")
    .maybeSingle();

  return Boolean(data);
}

/**
 * Resolves a tenant slug from an incoming HTTP Request URL, headers, or query parameters.
 */
export function resolveTenantFromRequest(request: Request): string | null {
  const url = new URL(request.url);

  // Check query params: ?tenant=slug or ?shop=slug or ?tenant_id=...
  const querySlug = url.searchParams.get("tenant") || url.searchParams.get("shop");
  if (querySlug) return querySlug;

  // Check startapp deep link param: startapp=s_<shopSlug>
  const startParam = url.searchParams.get("startapp") || url.searchParams.get("start_param");
  if (startParam && startParam.startsWith("s_")) {
    const parts = startParam.split("_");
    if (parts.length >= 2 && parts[1]) {
      return parts[1];
    }
  }

  // Check path pattern: /s/[shopSlug]
  const match = url.pathname.match(/^\/s\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
  shop_type: ShopType;
  description?: string;
  owner_telegram_id: string;
  contact_phone?: string;
  contact_email?: string;
  support_telegram?: string;
  telegram_channel?: string;
  telegram_group?: string;
  telegram_group_thread_id?: string;
  publish_target?: "channel" | "group" | "both" | "none";
  logo_file_id?: string | null;
  banner_file_id?: string | null;
  currency?: string;
}

/**
 * Provisions a brand new tenant and registers the creator as 'owner' in tenant_members.
 */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const cleanSlug = sanitizeSlug(input.slug);
  if (!cleanSlug || isSlugReserved(cleanSlug)) {
    throw new Error(`The shop handle '${input.slug}' is reserved or invalid.`);
  }

  const supabase = getSupabaseAdmin();

  // Check uniqueness
  const existing = await getTenantBySlug(cleanSlug);
  if (existing) {
    throw new Error(`The shop handle '${cleanSlug}' is already taken. Please choose another.`);
  }

  const { data: newTenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      slug: cleanSlug,
      name: input.name.trim(),
      shop_type: input.shop_type || "other",
      description: input.description?.trim() ?? null,
      owner_telegram_id: input.owner_telegram_id,
      contact_phone: input.contact_phone?.trim() ?? null,
      contact_email: input.contact_email?.trim() ?? null,
      support_telegram: input.support_telegram?.trim() ?? null,
      telegram_channel: input.telegram_channel?.trim() ?? null,
      telegram_group: input.telegram_group?.trim() ?? null,
      telegram_group_thread_id: input.telegram_group_thread_id?.trim() ?? null,
      publish_target: input.publish_target || "channel",
      logo_file_id: input.logo_file_id ?? null,
      banner_file_id: input.banner_file_id ?? null,
      currency: input.currency || "ETB",
      status: "active",
    })
    .select("*")
    .single();

  if (tenantError || !newTenant) {
    throw new Error(`Failed to create store: ${tenantError?.message ?? "unknown error"}`);
  }

  // Register owner in tenant_members
  await supabase.from("tenant_members").insert({
    tenant_id: newTenant.id,
    telegram_user_id: input.owner_telegram_id,
    role: "owner",
  });

  return newTenant as Tenant;
}