"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Pencil, Trash2, Send, Star, ImageOff } from "lucide-react";
import { apiGet, apiDelete, apiPatch, apiPost, ApiError } from "@/lib/apiClient";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/lib/i18n";
import { Spinner } from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { PRODUCT_AVAILABILITIES, type Product, type ProductAvailability } from "@/types/product";

interface ProductListProps {
  mode: "manage" | "stock" | "featured";
  onEdit?: (product: Product) => void;
}

export default function ProductList({ mode, onEdit }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [removeChannelPost, setRemoveChannelPost] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { t, tv } = useLanguage();

  const loadProducts = useCallback(() => {
    setIsLoading(true);
    apiGet<{ products: Product[] }>("/api/products")
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleAvailabilityChange(product: Product, availability: ProductAvailability) {
    const previous = products;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, availability } : p)));
    try {
      await apiPatch(`/api/products/${product.id}`, { availability });
      showToast("success", t("admin.productList.markedAs", { name: product.name, availability: tv("availability", availability) }));
    } catch (error) {
      setProducts(previous);
      showToast("error", error instanceof ApiError ? error.message : t("admin.productList.unavailableUpdate"));
    }
  }

  async function handleFeaturedToggle(product: Product) {
    const nextFeatured = !product.featured;
    const previous = products;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, featured: nextFeatured } : p)));
    try {
      await apiPatch(`/api/products/${product.id}`, { featured: nextFeatured });
      showToast(
        "success",
        nextFeatured
          ? t("admin.productList.nowFeatured", { name: product.name })
          : t("admin.productList.removedFeatured", { name: product.name })
      );
    } catch (error) {
      setProducts(previous);
      showToast("error", error instanceof ApiError ? error.message : t("admin.productList.updateError"));
    }
  }

  async function handlePublish(product: Product) {
    setPublishingId(product.id);
    try {
      const result = await apiPost<{ product: Product; channelWarning?: string | null }>(
        `/api/products/${product.id}/publish-channel`
      );
      setProducts((prev) => prev.map((p) => (p.id === product.id ? result.product : p)));
      if (result.channelWarning) {
        showToast("success", result.channelWarning);
      } else {
        showToast("success", t("admin.productList.published"));
      }
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : t("admin.productList.publishError"));
    } finally {
      setPublishingId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const query = removeChannelPost ? "?remove_channel_post=true" : "";
      await apiDelete(`/api/products/${pendingDelete.id}${query}`);
      setProducts((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      showToast("success", t("admin.productList.deleted"));
      setPendingDelete(null);
      setRemoveChannelPost(false);
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : t("admin.productList.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="loading-page">
        <Spinner surface="admin" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        surface="admin"
        icon={<Package size={24} />}
        title={t("admin.productList.emptyTitle")}
        description={t("admin.productList.emptyDescription")}
      />
    );
  }

  return (
    <>
      <div className="admin-list">
        {products.map((product) => (
          <div className="admin-list-item" key={product.id}>
            <div className="admin-list-item__top">
              <div style={{ display: "flex", gap: 10 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "var(--admin-surface-alt)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0].image_url}
                      alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <ImageOff size={16} color="var(--admin-text-muted)" />
                  )}
                </div>
                <div>
                  <p className="admin-list-item__title">{product.name}</p>
                  <p className="admin-list-item__subtitle">
                    {tv("productCategory", product.category)} · {formatPrice(product.price, product.currency)}
                  </p>
                </div>
              </div>
              <span className={`admin-badge admin-badge--${product.availability.toLowerCase().replace(" ", "-")}`}>
                {tv("availability", product.availability)}
              </span>
            </div>

            <div className="admin-list-item__meta-row">
              {product.featured && <span className="admin-badge admin-badge--featured">{t("admin.productList.featuredBadge")}</span>}
              {product.channel_published && (
                <span className="admin-badge admin-badge--completed">Channel 📢</span>
              )}
              {product.group_published && (
                <span className="admin-badge admin-badge--completed">Group 💬</span>
              )}
              {!product.channel_published && !product.group_published && (
                <span className="admin-badge admin-badge--muted">{t("admin.productList.notPublishedBadge")}</span>
              )}
            </div>

            {mode === "stock" ? (
              <Select
                surface="admin"
                aria-label={t("admin.productList.updateAvailabilityAria")}
                value={product.availability}
                onChange={(value) => handleAvailabilityChange(product, value as ProductAvailability)}
                options={PRODUCT_AVAILABILITIES.map((a) => ({ value: a, label: tv("availability", a) }))}
              />
            ) : mode === "featured" ? (
              <Button
                surface="admin"
                variant={product.featured ? "secondary" : "primary"}
                size="sm"
                onClick={() => handleFeaturedToggle(product)}
              >
                <Star size={14} fill={product.featured ? "currentColor" : "none"} />
                {product.featured ? t("admin.productList.removeFromFeatured") : t("admin.productList.markAsFeatured")}
              </Button>
            ) : (
              <div className="admin-list-item__actions">
                <Button surface="admin" variant="secondary" size="sm" onClick={() => onEdit?.(product)}>
                  <Pencil size={14} />
                  {t("admin.productList.edit")}
                </Button>
                <Button
                  surface="admin"
                  variant="secondary"
                  size="sm"
                  loading={publishingId === product.id}
                  onClick={() => handlePublish(product)}
                >
                  <Send size={14} />
                  {product.channel_published || product.group_published ? "Re-publish" : "Publish"}
                </Button>
                <Button
                  surface="admin"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setPendingDelete(product);
                    setRemoveChannelPost(false);
                  }}
                >
                  <Trash2 size={14} />
                  {t("admin.productList.delete")}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={t("admin.productList.deleteTitle")}
        surface="admin"
        footer={
          <>
            <Button surface="admin" variant="secondary" block onClick={() => setPendingDelete(null)}>
              {t("admin.cancel")}
            </Button>
            <Button surface="admin" variant="danger" block loading={isDeleting} onClick={confirmDelete}>
              {t("admin.productList.deleteButton")}
            </Button>
          </>
        }
      >
        <p>
          {t("admin.productList.deleteConfirm", { name: pendingDelete?.name ?? "" })}
        </p>
        {(pendingDelete?.channel_published || pendingDelete?.group_published) && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={removeChannelPost}
              onChange={(e) => setRemoveChannelPost(e.target.checked)}
            />
            Also remove Telegram posts (channel & group)
          </label>
        )}
      </Modal>
    </>
  );
}
