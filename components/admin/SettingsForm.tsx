"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/apiClient";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/lib/i18n";
import type { StoreSettings, PublishTarget } from "@/types/settings";
import { CheckCircle2, MessageSquare, Radio } from "lucide-react";

import { parseTelegramLink } from "@/lib/utils";

export default function SettingsForm() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [telegramChannel, setTelegramChannel] = useState("");
  const [telegramGroup, setTelegramGroup] = useState("");
  const [telegramGroupTitle, setTelegramGroupTitle] = useState("");
  const [telegramGroupThread, setTelegramGroupThread] = useState("");
  const [publishTarget, setPublishTarget] = useState<PublishTarget>("channel");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingGroup, setIsTestingGroup] = useState(false);

  const { showToast } = useToast();
  const { t } = useLanguage();

  function handleGroupInputChange(value: string) {
    setTelegramGroupTitle("");
    if (value.includes("t.me/")) {
      const parsed = parseTelegramLink(value);
      setTelegramGroup(parsed.chatId);
      if (parsed.threadId) {
        setTelegramGroupThread(parsed.threadId);
      }
    } else {
      setTelegramGroup(value);
    }
  }

  useEffect(() => {
    apiGet<{ settings: StoreSettings | null }>("/api/settings")
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
          setStoreName(data.settings.store_name);
          setStoreDescription(data.settings.store_description);
          setTelegramChannel(data.settings.telegram_channel ?? "");
          setTelegramGroup(data.settings.telegram_group ?? "");
          setTelegramGroupTitle(data.settings.telegram_group_title ?? "");
          setTelegramGroupThread(data.settings.telegram_group_thread_id ?? "");
          setPublishTarget(data.settings.publish_target ?? "channel");
          setContactPhone(data.settings.contact_phone ?? "");
          setContactEmail(data.settings.contact_email ?? "");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleTestGroup() {
    if (!telegramGroup.trim()) {
      showToast("error", t("admin.settingsForm.telegramGroup") + " is required for testing.");
      return;
    }

    setIsTestingGroup(true);
    try {
      const res = await apiPost<{
        chat: { title: string; type: string; is_forum?: boolean };
      }>("/api/telegram/test-group", {
        chat_id: telegramGroup.trim(),
        thread_id: telegramGroupThread.trim() || undefined,
      });

      const title = res.chat.title || "Telegram Group";
      setTelegramGroupTitle(title);
      showToast("success", t("admin.settingsForm.groupTestSuccess", { title }));
    } catch (error) {
      showToast(
        "error",
        error instanceof ApiError ? error.message : t("admin.settingsForm.groupTestError")
      );
    } finally {
      setIsTestingGroup(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await apiPatch<{ settings: StoreSettings }>("/api/settings", {
        store_name: storeName.trim(),
        store_description: storeDescription.trim(),
        telegram_channel: telegramChannel.trim() || null,
        telegram_group: telegramGroup.trim() || null,
        telegram_group_title: telegramGroupTitle.trim() || null,
        telegram_group_thread_id: telegramGroupThread.trim() || null,
        publish_target: publishTarget,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
      });
      setSettings(result.settings);
      showToast("success", t("admin.settingsForm.saved"));
    } catch (error) {
      showToast(
        "error",
        error instanceof ApiError ? error.message : t("admin.settingsForm.saveError")
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="loading-page">
        <Spinner surface="admin" />
      </div>
    );
  }

  return (
    <form className="admin-form" onSubmit={handleSave}>
      <div className="admin-form__grid-2">
        <Input
          surface="admin"
          label={t("admin.settingsForm.storeName")}
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          required
        />
        <Input
          surface="admin"
          label={t("admin.settingsForm.contactPhone")}
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder={t("admin.settingsForm.phonePlaceholder")}
        />
        <Input
          surface="admin"
          label={t("admin.settingsForm.contactEmail")}
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder={t("admin.settingsForm.emailPlaceholder")}
        />
      </div>

      <Textarea
        surface="admin"
        label={t("admin.settingsForm.storeDescription")}
        value={storeDescription}
        onChange={(e) => setStoreDescription(e.target.value)}
        rows={3}
      />

      <div style={{ padding: "16px", borderRadius: "12px", background: "var(--admin-surface-alt, rgba(255,255,255,0.03))", border: "1px solid var(--admin-border, rgba(255,255,255,0.08))", display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Radio size={18} color="var(--admin-accent)" />
          {t("admin.settingsForm.publishTarget")}
        </h3>
        <Select
          surface="admin"
          value={publishTarget}
          onChange={(val) => setPublishTarget(val as PublishTarget)}
          options={[
            { value: "channel", label: t("admin.settingsForm.targetChannel") },
            { value: "group", label: t("admin.settingsForm.targetGroup") },
            { value: "both", label: t("admin.settingsForm.targetBoth") },
          ]}
        />
      </div>

      <Input
        surface="admin"
        label={t("admin.settingsForm.telegramChannel")}
        value={telegramChannel}
        onChange={(e) => setTelegramChannel(e.target.value)}
        placeholder={t("admin.settingsForm.channelPlaceholder")}
      />

      <div style={{ padding: "16px", borderRadius: "12px", background: "var(--admin-surface-alt, rgba(255,255,255,0.03))", border: "1px solid var(--admin-border, rgba(255,255,255,0.08))", display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={18} color="var(--admin-accent)" />
          Telegram Group Connection
        </h3>

        <div className="admin-form__grid-3">
          <Input
            surface="admin"
            label={t("admin.settingsForm.telegramGroup")}
            value={telegramGroup}
            onChange={(e) => handleGroupInputChange(e.target.value)}
            placeholder={t("admin.settingsForm.groupPlaceholder")}
          />

          <Input
            surface="admin"
            label={t("admin.settingsForm.telegramGroupThread")}
            value={telegramGroupThread}
            onChange={(e) => setTelegramGroupThread(e.target.value)}
            placeholder={t("admin.settingsForm.threadPlaceholder")}
          />
        </div>

        {telegramGroupTitle && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13.5px", color: "var(--admin-success, #10b981)" }}>
            <CheckCircle2 size={16} />
            <span>{t("admin.settingsForm.groupTitle")}: <strong>{telegramGroupTitle}</strong></span>
          </div>
        )}

        <Button
          type="button"
          surface="admin"
          variant="secondary"
          size="sm"
          loading={isTestingGroup}
          onClick={handleTestGroup}
          style={{ width: "fit-content" }}
        >
          {isTestingGroup ? t("admin.settingsForm.testingGroup") : t("admin.settingsForm.testGroupConnection")}
        </Button>
      </div>

      <span className="admin-form__hint">{t("admin.settingsForm.credentialsHint")}</span>

      <Button surface="admin" variant="primary" type="submit" loading={isSaving} style={{ width: "fit-content", minWidth: 160 }}>
        {t("admin.settingsForm.save")}
      </Button>

      {settings === null && (
        <span className="admin-form__hint">{t("admin.settingsForm.noSettingsHint")}</span>
      )}
    </form>
  );
}
