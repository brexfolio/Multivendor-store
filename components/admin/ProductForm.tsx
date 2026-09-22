"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, ImagePlus, ArrowUp, ArrowDown, Star, X } from "lucide-react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  PRODUCT_AVAILABILITIES,
  type Product,
  type ProductCategory,
  type ProductCondition,
  type ProductAvailability,
} from "@/types/product";
import { getSuggestedSpecFields } from "@/lib/productSpecs";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/lib/i18n";
import { apiPost, apiPatch, apiUpload, ApiError } from "@/lib/apiClient";

interface ImageDraft {
  telegram_file_id: string | null;
  image_url: string;
  file?: File;
}

interface SpecDraft {
  label: string;
  value: string;
}

interface ProductFormProps {
  product?: Product;
  onSaved: (product: Product, channelWarning: string | null) => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSaved, onCancel }: ProductFormProps) {
  const isEditing = Boolean(product);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, tv } = useLanguage();

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? "Smartphones");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [condition, setCondition] = useState<ProductCondition>(product?.condition ?? "Brand New");
  const [description, setDescription] = useState(product?.description ?? "");
  const [availability, setAvailability] = useState<ProductAvailability>(
    product?.availability ?? "Available"
  );
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [publishTarget, setPublishTarget] = useState<string>(product?.publish_target ?? "default");
  const [images, setImages] = useState<ImageDraft[]>(
    (product?.images ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((img) => ({ telegram_file_id: img.telegram_file_id, image_url: img.image_url }))
  );
  const [specs, setSpecs] = useState<SpecDraft[]>(
    (product?.specifications ?? [])
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((s) => ({ label: s.label, value: s.value }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        if (image.file) URL.revokeObjectURL(image.image_url);
      });
    };
  }, []);

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const drafts = Array.from(files).map((file) => ({
      telegram_file_id: null,
      image_url: URL.createObjectURL(file),
      file,
    }));
    setImages((prev) => [...prev, ...drafts]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const target = prev[index];
      if (target.file) URL.revokeObjectURL(target.image_url);
      return prev.filter((_, i) => i !== index);
    });
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
        "/api/telegram/image",
        formData
      );
      URL.revokeObjectURL(image.image_url);
      resolved.push({ telegram_file_id: result.telegram_file_id, image_url: result.image_url });
    }
    return resolved;
  }

  function addCustomSpec() {
    setSpecs((prev) => [...prev, { label: "", value: "" }]);
  }

  function addPredefinedSpec(label: string) {
    setSpecs((prev) => (prev.some((s) => s.label === label) ? prev : [...prev, { label, value: "" }]));
  }

  function updateSpec(index: number, field: "label" | "value", value: string) {
    setSpecs((prev) => prev.map((spec, i) => (i === index ? { ...spec, [field]: value } : spec)));
  }

  function removeSpec(index: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  }

  const suggestedSpecFields = getSuggestedSpecFields(category);
  const suggestedSpecPills = suggestedSpecFields.filter(
    (label) => !specs.some((s) => s.label === label)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError(t("admin.form.nameRequired"));
    const priceNumber = Number(price);
    if (!priceNumber || priceNumber <= 0) return setError(t("admin.form.priceRequired"));

    const cleanedSpecs = specs.filter((s) => s.label.trim() && s.value.trim());

    setIsSaving(true);
    try {
      setIsUploading(true);
      const uploadedImages = await uploadPendingImages();
      setIsUploading(false);

      const payload = {
        name: name.trim(),
        category,
        price: priceNumber,
        currency: "ETB",
        condition,
        description: description.trim(),
        availability,
        featured,
        publish_target: publishTarget === "default" ? null : publishTarget,
        images: uploadedImages,
        specifications: cleanedSpecs,
      };

      const result = isEditing
        ? await apiPatch<{ product: Product; channelWarning: string | null }>(
            `/api/products/${product!.id}`,
            payload
          )
        : await apiPost<{ product: Product; channelWarning: string | null }>("/api/products", payload);

      onSaved(result.product, result.channelWarning);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : t("admin.form.saveFailed"));
    } finally {
      setIsUploading(false);
      setIsSaving(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form__grid-2">
        <Input
          surface="admin"
          label={t("admin.form.productName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("admin.form.productNamePlaceholder")}
          required
        />
        <Select
          surface="admin"
          label={t("admin.form.category")}
          value={category}
          onChange={(value) => setCategory(value as ProductCategory)}
          options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: tv("productCategory", c) }))}
        />
        <Select
          surface="admin"
          label={t("admin.form.condition")}
          value={condition}
          onChange={(value) => setCondition(value as ProductCondition)}
          options={PRODUCT_CONDITIONS.map((c) => ({ value: c, label: tv("condition", c) }))}
        />
        <Input
          surface="admin"
          label={t("admin.form.price")}
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t("admin.form.pricePlaceholder")}
          required
        />
        <Select
          surface="admin"
          label={t("admin.form.availability")}
          value={availability}
          onChange={(value) => setAvailability(value as ProductAvailability)}
          options={PRODUCT_AVAILABILITIES.map((a) => ({ value: a, label: tv("availability", a) }))}
        />
        <Select
          surface="admin"
          label="Publishing Destination"
          value={publishTarget}
          onChange={(val) => setPublishTarget(val)}
          options={[
            { value: "default", label: "Use Store Default Setting" },
            { value: "channel", label: "Channel Only" },
            { value: "group", label: "Group Only" },
            { value: "both", label: "Both Channel & Group" },
          ]}
        />
      </div>

      <Textarea
        surface="admin"
        label={t("admin.form.description")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("admin.form.descriptionPlaceholder")}
        rows={4}
      />

      <div className="admin-toggle-row">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Star size={16} color="var(--admin-accent)" />
          <span className="admin-toggle-row__label">{t("admin.form.featured")}</span>
        </div>
        <label className="admin-switch">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          <span className="admin-switch__track" />
        </label>
      </div>

      <div className="admin-form__field">
        <span className="admin-form__label">{t("admin.form.productImages")}</span>
        <div className="admin-image-grid">
          {images.map((image, index) => (
            <div className="admin-image-thumb" key={`${image.image_url}-${index}`}>
              <img src={image.image_url} alt={`${t("product.product")} ${index + 1}`} />
              <span className="admin-image-thumb__order">{index + 1}</span>
              <button
                type="button"
                className="admin-image-thumb__remove"
                onClick={() => removeImage(index)}
                aria-label={t("admin.form.removeImage")}
              >
                <Trash2 size={12} />
              </button>
              <div style={{ position: "absolute", bottom: 4, right: 4, display: "flex", gap: 4 }}>
                {index > 0 && (
                  <button
                    type="button"
                    className="admin-image-thumb__remove"
                    onClick={() => moveImage(index, -1)}
                    aria-label={t("admin.form.moveEarlier")}
                  >
                    <ArrowUp size={12} />
                  </button>
                )}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    className="admin-image-thumb__remove"
                    onClick={() => moveImage(index, 1)}
                    aria-label={t("admin.form.moveLater")}
                  >
                    <ArrowDown size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="admin-image-upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
          >
            <ImagePlus size={20} />
            {t("admin.form.addImage")}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <span className="admin-form__hint">
          {isEditing ? t("admin.form.imageHintSave") : t("admin.form.imageHintPublish")}
        </span>
      </div>

      <div className="admin-form__field">
        <span className="admin-form__label">{t("admin.form.specifications")}</span>

        {suggestedSpecPills.length > 0 && (
          <div className="admin-spec-pills">
            {suggestedSpecPills.map((label) => (
              <button
                key={label}
                type="button"
                className="admin-spec-pill"
                onClick={() => addPredefinedSpec(label)}
              >
                <Plus size={14} />
                {label}
              </button>
            ))}
          </div>
        )}

        {specs.map((spec, index) => {
          const isPredefined = suggestedSpecFields.includes(spec.label);
          return (
            <div className="admin-spec-entry" key={index}>
              {isPredefined ? (
                <span className="admin-spec-entry__label">{spec.label}</span>
              ) : (
                <Input
                  surface="admin"
                  className="admin-spec-entry__label-input"
                  placeholder={t("admin.form.labelPlaceholder")}
                  value={spec.label}
                  onChange={(e) => updateSpec(index, "label", e.target.value)}
                  aria-label={t("admin.form.specNameAria")}
                />
              )}
              <Input
                surface="admin"
                className="admin-spec-entry__value-input"
                placeholder={t("admin.form.valuePlaceholder")}
                value={spec.value}
                onChange={(e) => updateSpec(index, "value", e.target.value)}
                aria-label={t("admin.form.specValueAria")}
              />
              <button
                type="button"
                className="admin-spec-entry__remove"
                onClick={() => removeSpec(index)}
                aria-label={t("admin.form.removeSpec")}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}

        <button type="button" className="admin-add-row-btn" onClick={addCustomSpec}>
          <Plus size={16} />
          {t("admin.form.addCustomSpec")}
        </button>
      </div>

      {error && <p className="admin-form__error">{error}</p>}

      {isEditing && product?.channel_published && (
        <p className="admin-form__hint">{t("admin.form.channelLiveHint")}</p>
      )}

      <div className="admin-bottom-bar">
        <Button surface="admin" variant="secondary" type="button" onClick={onCancel}>
          {t("admin.cancel")}
        </Button>
        <Button surface="admin" variant="primary" type="submit" loading={isSaving}>
          {isUploading ? t("admin.form.uploading") : isEditing ? t("admin.form.saveChanges") : t("admin.form.publishProduct")}
        </Button>
      </div>
    </form>
  );
}
