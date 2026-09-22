import { getSupabaseAdmin } from "./supabase";
import type { Tenant, TenantMember, PlatformAdmin } from "@/types/tenant";

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "explore",
  "orders",
  "products",
  "favorites",
  "sell-device",
  "my-sell-requests",
  "auth",
  "settings",
  "super-admin",
  "s",
  "static",
  "_next",
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
    .single();

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
    .single();

  if (error || !data) return null;
  return data as Tenant;
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

  // Fallback to the earliest created tenant
  const { data: firstTenant } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (firstTenant as Tenant) ?? null;
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
 * Returns all stores a Telegram user has staff/manager/owner permissions for.
 */
export async function getUserTenants(telegramUserId: string): Promise<Array<Tenant & { role: string }>> {
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
 * Validates whether a user has administrative privileges for a specific tenant.
 */
export async function checkTenantPermission(
  telegramUserId: string,
  tenantId: string,
  requiredRole: "staff" | "manager" | "owner" = "staff"
): Promise<{ allowed: boolean; role?: string; tenant?: Tenant }> {
  // Platform super-admins bypass tenant checks
  const isSuper = await isPlatformAdmin(telegramUserId);
  if (isSuper) {
    const tenant = await getTenantById(tenantId);
    return { allowed: true, role: "owner", tenant: tenant ?? undefined };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("role, tenant:tenants(*)")
    .eq("telegram_user_id", telegramUserId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !data) {
    return { allowed: false };
  }

  const rolesHierarchy = { staff: 1, manager: 2, owner: 3 };
  const userRank = rolesHierarchy[data.role as keyof typeof rolesHierarchy] ?? 0;
  const requiredRank = rolesHierarchy[requiredRole];

  const tenant = Array.isArray(data.tenant) ? data.tenant[0] : data.tenant;
  return {
    allowed: userRank >= requiredRank,
    role: data.role,
    tenant: (tenant as Tenant) ?? undefined,
  };
}

export interface CreateTenantInput {
  slug: string;
  name: string;
  description?: string;
  owner_telegram_id: string;
  contact_phone?: string;
  contact_email?: string;
  telegram_channel?: string;
  currency?: string;
}

/**
 * Provisions a brand new tenant and sets the caller as 'owner'.
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
      description: input.description?.trim() ?? null,
      owner_telegram_id: input.owner_telegram_id,
      contact_phone: input.contact_phone?.trim() ?? null,
      contact_email: input.contact_email?.trim() ?? null,
      telegram_channel: input.telegram_channel?.trim() ?? null,
      currency: input.currency || "ETB",
      status: "active",
    })
    .select("*")
    .single();

  if (tenantError || !newTenant) {
    throw new Error(`Failed to create tenant: ${tenantError?.message ?? "unknown error"}`);
  }

  // Register owner in tenant_members
  await supabase.from("tenant_members").insert({
    tenant_id: newTenant.id,
    telegram_user_id: input.owner_telegram_id,
    role: "owner",
  });

  return newTenant as Tenant;
}
