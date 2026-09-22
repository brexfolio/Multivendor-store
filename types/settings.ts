export type PublishTarget = "channel" | "group" | "both";

export interface StoreSettings {
  id: string;
  store_name: string;
  store_description: string;
  telegram_channel: string | null;
  telegram_group: string | null;
  telegram_group_title: string | null;
  telegram_group_thread_id: string | null;
  publish_target: PublishTarget;
  contact_phone: string | null;
  contact_email: string | null;
  updated_at: string;
}

