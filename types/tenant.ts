import type { PublishTarget } from "./settings";

export type TenantStatus = "active" | "suspended" | "trial";

export type TenantRole = "owner" | "manager" | "staff";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  owner_telegram_id: string;
  contact_phone: string | null;
  contact_email: string | null;
  support_telegram: string | null;
  telegram_channel: string | null;
  telegram_group: string | null;
  telegram_group_title: string | null;
  telegram_group_thread_id: string | null;
  publish_target: PublishTarget;
  custom_bot_token?: string | null;
  custom_bot_username?: string | null;
  status: TenantStatus;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  telegram_user_id: string;
  role: TenantRole;
  created_at: string;
  tenant?: Tenant;
}

export interface PlatformAdmin {
  telegram_user_id: string;
  name: string | null;
  created_at: string;
}
