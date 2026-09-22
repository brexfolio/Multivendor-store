"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  CheckCircle2,
  User as UserIcon,
  ClipboardList,
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Gamepad2,
  Headphones,
  Package,
} from "lucide-react";
import {
  SELL_DEVICE_CATEGORIES,
  SELL_DEVICE_CONDITIONS,
  DEVICE_BRANDS,
  type SellDeviceCategory,
  type SellDeviceCondition,
} from "@/types/sellRequest";
import { CATEGORY_SPEC_FIELDS, hasPredefinedSpecs } from "@/lib/sellDeviceSpecs";
import Header from "@/components/store/Header";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useTelegramUser } from "@/lib/useTelegramUser";
import { formatPrice } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { apiPost, apiUpload, ApiError } from "@/lib/apiClient";

interface ImageDraft {
  telegram_file_id: string | null;
  image_url: string;
  file?: File;
}

interface SpecDraft {
  label: string;
  value: string;
}

const TOTAL_STEPS = 6;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const CATEGORY_ICONS: Record<SellDeviceCategory, LucideIcon> = {
  Smartphone: Smartphone,
  Laptop: Laptop,
  Tablet: Tablet,
  "Smart Watch": Watch,
  "Gaming Device": Gamepad2,
  Accessory: Headphones,
  Other: Package,
};

type LucideIcon = typeof Smartphone;

export default function SellDevicePage() {
  const router = useRouter();
  const { user } = useTelegramUser();
  const { showToast } = useToast();
  const { t, tv } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [reviewing, setReviewing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<SellDeviceCategory>("Smartphone");
  const [brand, setBrand] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [model, setModel] = useState("");
  const [productName, setProductName] = useState("");

  const [condition, setCondition] = useState<SellDeviceCondition>("Good");
  const [conditionDescription, setConditionDescription] = useState("");

  const [specs, setSpecs] = useState<SpecDraft[]>([]);
  const [customSpecs, setCustomSpecs] = useState<SpecDraft[]>([{ label: "", value: "" }]);

  const [expectedPrice, setExpectedPrice] = useState("");
  const [priceNegotiable, setPriceNegotiable] = useState(true);

  const [images, setImages] = useState<ImageDraft[]>([]);

  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        if (image.file) URL.revokeObjectURL(image.image_url);
      });
    };
  }, []);

  const effectiveBrand = brand === "Other" ? customBrand.trim() : brand;
  const predefined = hasPredefinedSpecs(category);

  function updatePredefinedSpec(label: string, value: string) {
    setSpecs((prev) => {
      const existing = prev.find((s) => s.label === label);
      if (existing) return prev.map((s) => (s.label === label ? { ...s, value } : s));
      return [...prev, { label, value }];
    });
  }

  function getPredefinedValue(label: string) {
    return specs.find((s) => s.label === label)?.value ?? "";
  }

  function updateCustomSpec(index: number, field: "label" | "value", value: string) {
    setCustomSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addCustomSpec() {
    setCustomSpecs((prev) => [...prev, { label: "", value: "" }]);
  }

  function removeCustomSpec(index: number) {
    setCustomSpecs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const drafts: ImageDraft[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        showToast("error", t("sell.uploadTypeError"));
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        showToast("error", t("sell.uploadTooLarge"));
        continue;
      }
      drafts.push({
        telegram_file_id: null,
        image_url: URL.createObjectURL(file),
        file,
      });
    }
    if (drafts.length > 0) setImages((prev) => [...prev, ...drafts]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadPendingImages(): Promise<ImageDraft[]> {
    const resolved: ImageDraft[] = [];
    for (const image of images) {
      if (!image.file) {
        resolved.push({ telegram_file_id: image.telegram_file_id, image_url: image.image_url });
        continue;
      }
      const formData = new FormData();
      formData.append("file", image.file);
      const result = await apiUpload<{ telegram_file_id: string; image_url: string }>(
        "/api/sell-requests/upload-image",
        formData
      );
      URL.revokeObjectURL(image.image_url);
      resolved.push({ telegram_file_id: result.telegram_file_id, image_url: result.image_url });
    }
    return resolved;
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const target = prev[index];
      if (target?.file) URL.revokeObjectURL(target.image_url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!effectiveBrand) return t("sell.brandRequired");
      if (!model.trim()) return t("sell.modelRequired");
    }
    if (current === 4) {
      const price = Number(expectedPrice);
      if (!price || price <= 0) return t("sell.priceRequired");
    }
    if (current === 5) {
      if (images.length === 0) return t("sell.photoRequired");
    }
    return null;
  }

  function goNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      showToast("error", validationError);
      return;
    }
    setError(null);
    if (step === TOTAL_STEPS) {
      setReviewing(true);
    } else {
      setStep((s) => s + 1);
    }
  }

  function goBack() {
    if (reviewing) {
      setReviewing(false);
      return;
    }
    if (step === 1) {
      router.push("/");
      return;
    }
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function buildFinalSpecs(): SpecDraft[] {
    if (predefined) {
      return specs.filter((s) => s.value.trim());
    }
    return customSpecs.filter((s) => s.label.trim() && s.value.trim());
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      setIsUploading(true);
      const uploadedImages = await uploadPendingImages();
      setIsUploading(false);
      await apiPost("/api/sell-requests", {
        category,
        brand: effectiveBrand,
        model: model.trim(),
        product_name: productName.trim() || undefined,
        condition,
        condition_description: conditionDescription.trim(),
        expected_price: Number(expectedPrice),
        currency: "ETB",
        price_negotiable: priceNegotiable,
        specifications: buildFinalSpecs(),
        images: uploadedImages,
      });
      setSubmitted(true);
    } catch (submitError) {
      showToast("error", submitError instanceof ApiError ? submitError.message : t("sell.submitFailed"));
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="store-shell">
        <Header />
        <div style={{ padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
          <div className="empty-state__icon" style={{ background: "var(--store-success-bg)", color: "var(--store-success)", width: 64, height: 64 }}>
            <CheckCircle2 size={30} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{t("sell.submittedTitle")}</h1>
          <p style={{ fontSize: 14, color: "var(--store-text-muted)", maxWidth: 300, lineHeight: 1.5 }}>
            {t("sell.submittedDescription")}
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Link href="/my-sell-requests">
              <Button variant="secondary">{t("sell.mySubmissions")}</Button>
            </Link>
            <Button variant="primary" onClick={() => router.push("/")}>
              {t("sell.backToStore")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="store-shell">
      <Header />

      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, width: "100%" }}>
        <h1 className="page-header__title">{t("sell.title")}</h1>
        <Link href="/my-sell-requests" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--store-primary)", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <ClipboardList size={14} />
          {t("sell.mySubmissions")}
        </Link>
      </div>

      <div className="step-header">
        <p className="step-header__eyebrow">
          {reviewing
            ? t("sell.review")
            : t("sell.step", { step, total: TOTAL_STEPS })}
        </p>
        <p className="step-header__title">
          {reviewing ? t("sell.reviewAndSubmit") : t(`sell.step${step}`)}
        </p>
        <div className="step-progress">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <div className="step-progress__bar" key={index}>
              <div
                className="step-progress__bar-fill"
                style={{ width: reviewing || index < step ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="sell-form">
        {error && <p className="form-error">{error}</p>}

        {!reviewing && step === 1 && (
          <>
            <div className="field">
              <span className="field__label">{t("sell.deviceCategory")}</span>
              <div className="category-picker">
                {SELL_DEVICE_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`category-tile ${category === cat ? "category-tile--active" : ""}`}
                      onClick={() => setCategory(cat)}
                    >
                      <span className="category-tile__icon">
                        <Icon size={22} />
                      </span>
                      <span className="category-tile__label">{tv("sellCategory", cat)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <span className="field__label">{t("sell.brand")}</span>
              <div className="brand-chip-wrap">
                {DEVICE_BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={`brand-chip ${brand === b ? "brand-chip--active" : ""}`}
                    onClick={() => setBrand(b)}
                  >
                    {tv("brand", b)}
                  </button>
                ))}
              </div>
              {brand === "Other" && (
                <Input
                  placeholder={t("sell.brandPlaceholder")}
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                />
              )}
            </div>

            <div className="store-form__grid-2">
              <Input
                label={t("sell.modelName")}
                placeholder={t("sell.modelPlaceholder")}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />

              <Input
                label={t("sell.productName")}
                placeholder={t("sell.productNamePlaceholder")}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
          </>
        )}

        {!reviewing && step === 2 && (
          <>
            <div className="field">
              <span className="field__label">{t("sell.overallCondition")}</span>
              <div className="option-grid option-grid--single-row">
                {SELL_DEVICE_CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`option-card ${condition === c ? "option-card--active" : ""}`}
                    onClick={() => setCondition(c)}
                  >
                    {tv("sellCondition", c)}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              label={t("sell.conditionDescriptionLabel")}
              placeholder={t("sell.conditionDescriptionPlaceholder")}
              value={conditionDescription}
              onChange={(e) => setConditionDescription(e.target.value)}
              rows={5}
            />
          </>
        )}

        {!reviewing && step === 3 && (
          <>
            {predefined ? (
              <div className="store-form__grid-2">
                {CATEGORY_SPEC_FIELDS[category]!.map((label) => (
                  <Input
                    key={label}
                    label={tv("specLabel", label)}
                    value={getPredefinedValue(label)}
                    onChange={(e) => updatePredefinedSpec(label, e.target.value)}
                  />
                ))}
              </div>
            ) : (
              <div className="field">
                <span className="field__label">{t("sell.specifications")}</span>
                {customSpecs.map((spec, index) => (
                  <div className="store-spec-row" key={index} style={{ marginBottom: 8 }}>
                    <Input
                      placeholder={t("sell.specNamePlaceholder")}
                      value={spec.label}
                      onChange={(e) => updateCustomSpec(index, "label", e.target.value)}
                      aria-label={t("sell.specNamePlaceholder")}
                    />
                    <Input
                      placeholder={t("sell.specValuePlaceholder")}
                      value={spec.value}
                      onChange={(e) => updateCustomSpec(index, "value", e.target.value)}
                      aria-label={t("sell.specValuePlaceholder")}
                    />
                    <button
                      type="button"
                      className="store-spec-remove"
                      onClick={() => removeCustomSpec(index)}
                      aria-label={t("sell.removeSpecification")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button type="button" className="store-add-row-btn" onClick={addCustomSpec}>
                  <Plus size={16} />
                  {t("sell.addSpecification")}
                </button>
              </div>
            )}
          </>
        )}

        {!reviewing && step === 4 && (
          <div className="store-form__grid-2" style={{ alignItems: "center" }}>
            <Input
              label={t("sell.expectedPriceLabel")}
              type="number"
              min="0"
              step="0.01"
              value={expectedPrice}
              onChange={(e) => setExpectedPrice(e.target.value)}
              placeholder={t("sell.pricePlaceholder")}
            />
            <div className="store-toggle-row">
              <span className="store-toggle-row__label">{t("sell.priceNegotiable")}</span>
              <label className="store-switch">
                <input type="checkbox" checked={priceNegotiable} onChange={(e) => setPriceNegotiable(e.target.checked)} />
                <span className="store-switch__track" />
              </label>
            </div>
          </div>
        )}

        {!reviewing && step === 5 && (
          <div className="field">
            <span className="field__label">{t("sell.devicePhotos")}</span>
            <span className="form-hint" style={{ display: "block", marginBottom: 8 }}>
              {t("sell.photosHint")}
            </span>
            <div className="photo-grid">
              {images.map((image, index) => (
                <div className="photo-thumb" key={`${image.image_url}-${index}`}>
                  <img src={image.image_url} alt={`Device photo ${index + 1}`} />
                  <button type="button" className="photo-thumb__remove" onClick={() => removeImage(index)} aria-label={t("sell.removePhoto")}>
                    <Trash2 size={12} />
                  </button>
                  <div style={{ position: "absolute", bottom: 4, right: 4, display: "flex", gap: 4 }}>
                    {index > 0 && (
                      <button type="button" className="photo-thumb__remove" onClick={() => moveImage(index, -1)} aria-label={t("sell.moveEarlier")}>
                        <ArrowUp size={12} />
                      </button>
                    )}
                    {index < images.length - 1 && (
                      <button type="button" className="photo-thumb__remove" onClick={() => moveImage(index, 1)} aria-label={t("sell.moveLater")}>
                        <ArrowDown size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" className="photo-upload-tile" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <Camera size={20} />
                {isUploading ? t("sell.uploading") : t("sell.addPhoto")}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </div>
        )}

        {!reviewing && step === 6 && (
          <div className="review-card">
            <p className="review-card__title">{t("sell.telegramIdentity")}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="empty-state__icon" style={{ width: 42, height: 42 }}>
                <UserIcon size={18} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
                  {user
                    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || t("home.telegramUser")
                    : t("home.telegramUser")}
                </p>
                {user?.username && (
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--store-text-muted)" }}>@{user.username}</p>
                )}
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--store-text-muted)", marginTop: 12, marginBottom: 0 }}>
              {t("sell.telegramIdentityHint")}
            </p>
          </div>
        )}

        {reviewing && (
          <>
            <div className="review-card">
              <p className="review-card__title">{t("sell.device")}</p>
              <div className="review-row">
                <span className="review-row__label">{t("sell.productNameLabel")}</span>
                <span className="review-row__value">{productName || `${effectiveBrand} ${model}`}</span>
              </div>
              <div className="review-row">
                <span className="review-row__label">{t("sell.category")}</span>
                <span className="review-row__value">{tv("sellCategory", category)}</span>
              </div>
              <div className="review-row">
                <span className="review-row__label">{t("sell.brandLabel")}</span>
                <span className="review-row__value">{tv("brand", effectiveBrand)}</span>
              </div>
              <div className="review-row">
                <span className="review-row__label">{t("sell.model")}</span>
                <span className="review-row__value">{model}</span>
              </div>
              <div className="review-row">
                <span className="review-row__label">{t("sell.condition")}</span>
                <span className="review-row__value">{tv("sellCondition", condition)}</span>
              </div>
            </div>

            {buildFinalSpecs().length > 0 && (
              <div className="review-card">
                <p className="review-card__title">{t("sell.specifications")}</p>
                {buildFinalSpecs().map((spec) => (
                  <div className="review-row" key={spec.label}>
                    <span className="review-row__label">{tv("specLabel", spec.label)}</span>
                    <span className="review-row__value">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="review-card">
              <p className="review-card__title">{t("sell.price")}</p>
              <div className="review-row">
                <span className="review-row__label">{t("sell.expectedPrice")}</span>
                <span className="review-row__value">{formatPrice(Number(expectedPrice) || 0)}</span>
              </div>
              <div className="review-row">
                <span className="review-row__label">{t("sell.negotiable")}</span>
                <span className="review-row__value">{priceNegotiable ? t("sell.yes") : t("sell.no")}</span>
              </div>
            </div>

            <div className="review-card">
              <p className="review-card__title">{t("sell.photoCount", { count: images.length })}</p>
              <div className="photo-grid">
                {images.map((image, index) => (
                  <div className="photo-thumb" key={index}>
                    <img src={image.image_url} alt={`Device photo ${index + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="form-inline-actions">
          <Button variant="secondary" onClick={goBack} disabled={isSubmitting}>
            <ArrowLeft size={16} />
            {t("sell.back")}
          </Button>
          {reviewing ? (
            <Button variant="primary" loading={isSubmitting} onClick={handleSubmit}>
              {t("sell.submitForReview")}
            </Button>
          ) : (
            <Button variant="primary" onClick={goNext}>
              {t("sell.next")}
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
