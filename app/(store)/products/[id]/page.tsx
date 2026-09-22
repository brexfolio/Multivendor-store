"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Heart,
  ImageOff,
  MessageSquareText,
  ShoppingCart,
  Minus,
  Plus,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import type { Product } from "@/types/product";
import { formatPrice } from "@/lib/utils";
import { apiGet, apiPost, ApiError } from "@/lib/apiClient";
import { useFavorites } from "@/lib/useFavorites";
import { useTelegramUser } from "@/lib/useTelegramUser";
import { hapticNotification, hapticImpact } from "@/lib/telegram";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/lib/i18n";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";

const BADGE_CLASS: Record<string, string> = {
  Available: "status-pill--available",
  "Low Stock": "status-pill--pending",
  Sold: "status-pill--sold",
  Unavailable: "status-pill--unavailable",
  "Out of Stock": "status-pill--out-of-stock",
};

const PARTICLE_COUNT = 8;
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (360 / PARTICLE_COUNT) * i + 22.5);

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useTelegramUser();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t, tv } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [heartKey, setHeartKey] = useState(0);
  const [burst, setBurst] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet<{ product: Product }>(`/api/products/${params.id}`)
      .then((data) => setProduct(data.product))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const isDeepLinkEntry = useMemo(() => {
    if (typeof window === "undefined") return false;
    const webApp = (window as { Telegram?: any }).Telegram?.WebApp;
    const startParam: unknown = webApp?.initDataUnsafe?.start_param;
    return typeof startParam === "string" && /^product_/.test(startParam);
  }, []);

  function getShareUrl(): string {
    if (typeof window === "undefined") return "";
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    const appName = process.env.NEXT_PUBLIC_TELEGRAM_APP_NAME;
    if (botUsername && appName && appName.trim()) {
      const cleanApp = appName.trim().toLowerCase();
      return `https://t.me/${botUsername}/${cleanApp}?startapp=product_${params.id}`;
    }
    return `${window.location.origin}/products/${params.id}`;
  }

  function getShareText(): string {
    return product ? product.name : "Check out this product";
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopiedLink(true);
      showToast("success", t("product.linkCopied"));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast("error", t("product.copyFailed"));
    }
  }

  function handleShareTelegram() {
    const url = getShareUrl();
    const text = encodeURIComponent(getShareText());
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, "_blank");
  }

  function handleShareWhatsApp() {
    const url = getShareUrl();
    const text = encodeURIComponent(`${getShareText()} ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: getShareText(), url: getShareUrl() });
    } catch {
      // user cancelled
    }
  }

  if (isLoading) return <LoadingPage />;

  if (notFound || !product) {
    return (
      <div className="store-shell store-shell--no-nav">
        <EmptyState
          icon={<ImageOff size={26} />}
          title={t("product.notFoundTitle")}
          description={t("product.notFoundDescription")}
          action={
            <Button onClick={() => router.push("/")} style={{ marginTop: 12 }}>
              {t("product.backToStore")}
            </Button>
          }
        />
      </div>
    );
  }

  const images = product.images ?? [];
  const specs = product.specifications ?? [];
  const favorite = isFavorite(product.id);
  const isOrderable = product.availability === "Available" || product.availability === "Low Stock";

  function handleBack() {
    if (isDeepLinkEntry) {
      router.replace("/");
    } else {
      router.back();
    }
  }

  function handleFavorite() {
    hapticImpact("light");
    setHeartKey((k) => k + 1);
    setBurst((b) => b + 1);
    toggleFavorite(product!.id);
  }

  function scrollToImage(index: number) {
    const track = galleryRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(index, images.length - 1));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    setActiveImage(clamped);
  }

  async function submitRequest() {
    setIsSubmitting(true);
    try {
      await apiPost(`/api/requests`, { product_id: product!.id });
      hapticNotification("success");
      showToast("success", t("product.requestSent"));
      setShowRequestModal(false);
    } catch (error) {
      hapticNotification("error");
      showToast("error", error instanceof ApiError ? error.message : t("product.unableToSendRequest"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitOrder() {
    setIsSubmitting(true);
    try {
      await apiPost(`/api/orders`, { product_id: product!.id, quantity });
      hapticNotification("success");
      showToast("success", t("product.orderPlaced"));
      setShowOrderModal(false);
      setQuantity(1);
    } catch (error) {
      hapticNotification("error");
      showToast("error", error instanceof ApiError ? error.message : t("product.unableToPlaceOrder"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="product-detail">
      <div className="product-detail__topbar">
        <button type="button" className="product-detail__icon-btn" onClick={handleBack} aria-label={t("product.goBack")}>
          <ArrowLeft size={18} />
        </button>
        <div className="product-detail__topbar-actions">
          <button
            type="button"
            className="product-detail__icon-btn"
            onClick={() => setShowShareSheet(true)}
            aria-label={t("product.share")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 128 128" fill="currentColor">
              <path d="M8 116q-.459 0-.918-.105A4.01 4.01 0 0 1 4 112c0-36.348 4.598-66.578 60-67.953V16a4 4 0 0 1 6.715-2.937l52 48c.82.753 1.285 1.82 1.285 2.937s-.465 2.184-1.285 2.938l-52 48a3.99 3.99 0 0 1-4.32.727A4 4 0 0 1 64 112V84.047c-38.004.91-45.016 14.93-52.422 29.742A4 4 0 0 1 8 116m60-40c2.211 0 4 1.789 4 4v22.863L114.102 64 72 25.137V48c0 2.211-1.789 4-4 4-44.188 0-53.703 17.09-55.574 44.387C20.711 85.258 34.832 76 68 76" />
            </svg>
          </button>
          <button
            type="button"
            className="product-detail__icon-btn product-detail__favorite"
            onClick={handleFavorite}
            aria-label={favorite ? t("favorites.remove") : t("favorites.add")}
            aria-pressed={favorite}
            style={favorite ? { color: "#ff5470" } : undefined}
          >
            <span key={heartKey} className={`product-detail__heart ${favorite ? "product-detail__heart--pop" : ""}`}>
              <Heart size={18} fill={favorite ? "currentColor" : "none"} />
            </span>
            {burst > 0 && (
              <span className={`product-detail__burst ${favorite ? "product-detail__burst--on" : "product-detail__burst--off"}`} key={`burst-${burst}`}>
                {PARTICLE_ANGLES.map((angle, i) => (
                  <span
                    key={i}
                    className="product-detail__particle"
                    style={{ ["--angle" as string]: `${angle}deg` }}
                  />
                ))}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="product-gallery">

        {images.length > 0 ? (
          <>
            <div
              className="product-gallery__track"
              ref={galleryRef}
              onScroll={(e) => {
                const target = e.currentTarget;
                const index = Math.round(target.scrollLeft / target.clientWidth);
                setActiveImage(index);
              }}
            >
              {images.map((image) => (
                <div key={image.id} className="product-gallery__slide">
                  <img
                    src={image.image_url}
                    alt={product.name}
                    className="product-gallery__image"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallback === "true") return;
                      img.dataset.fallback = "true";
                      img.style.display = "none";
                      img.parentElement?.classList.add("product-gallery__slide--broken");
                    }}
                  />
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="product-gallery__nav-btn product-gallery__nav-btn--prev"
                  onClick={() => scrollToImage(activeImage - 1)}
                  aria-label={t("product.previousImage")}
                  disabled={activeImage === 0}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="product-gallery__nav-btn product-gallery__nav-btn--next"
                  onClick={() => scrollToImage(activeImage + 1)}
                  aria-label={t("product.nextImage")}
                  disabled={activeImage === images.length - 1}
                >
                  <ChevronRight size={18} />
                </button>
                <div className="product-gallery__dots">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      className={`product-gallery__dot ${
                        index === activeImage ? "product-gallery__dot--active" : ""
                      }`}
                      onClick={() => scrollToImage(index)}
                      aria-label={t("product.goToImage", { index: index + 1 })}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--store-text-muted)",
            }}
          >
            <ImageOff size={40} />
          </div>
        )}
      </div>

      <div className="product-detail__info">
        <p className="product-detail__category">{tv("productCategory", product.category)}</p>
        <h1 className="product-detail__title">{product.name}</h1>
        <div className="product-detail__price-row">
          <span className="product-detail__price">{formatPrice(product.price, product.currency)}</span>
          <span className={`status-pill ${BADGE_CLASS[product.availability] ?? ""}`}>
            {tv("availability", product.availability)}
          </span>
        </div>

        <div className="product-detail__meta-grid">
          <div className="product-detail__meta-item">
            <p className="product-detail__meta-label">{t("product.condition")}</p>
            <p className="product-detail__meta-value">{tv("condition", product.condition)}</p>
          </div>
          <div className="product-detail__meta-item">
            <p className="product-detail__meta-label">{t("product.category")}</p>
            <p className="product-detail__meta-value">{tv("productCategory", product.category)}</p>
          </div>
        </div>

        {specs.length > 0 && (
          <>
            <h2 className="product-detail__section-title">{t("product.specifications")}</h2>
            <div className="spec-table">
              {specs.map((spec) => (
                <div key={spec.id} className="spec-table__row">
                  <span className="spec-table__label">{spec.label}</span>
                  <span className="spec-table__value">{spec.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {product.description && (
          <>
            <h2 className="product-detail__section-title">{t("product.description")}</h2>
            <p className="product-detail__description">{product.description}</p>
          </>
        )}
      </div>

      <div className="product-detail__actions">
        <Button
          variant="secondary"
          block
          disabled={!isOrderable}
          onClick={() => setShowRequestModal(true)}
        >
          <MessageSquareText size={17} />
          {t("product.requestProduct")}
        </Button>
        <Button variant="primary" block disabled={!isOrderable} onClick={() => setShowOrderModal(true)}>
          <ShoppingCart size={17} />
          {t("product.orderNow")}
        </Button>
      </div>

      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title={t("product.confirmRequest")}
        footer={
          <>
            <Button variant="secondary" block onClick={() => setShowRequestModal(false)}>
              {t("product.cancel")}
            </Button>
            <Button variant="primary" block loading={isSubmitting} onClick={submitRequest}>
              {t("product.sendRequest")}
            </Button>
          </>
        }
      >
        <div className="modal__summary-row">
          <span>{t("product.product")}</span>
          <strong>{product.name}</strong>
        </div>
        <div className="modal__summary-row">
          <span>{t("product.price")}</span>
          <strong>{formatPrice(product.price, product.currency)}</strong>
        </div>
        <div className="modal__summary-row">
          <span>{t("product.yourName")}</span>
          <strong>
            {user
              ? [user.first_name, user.last_name].filter(Boolean).join(" ") || t("home.telegramUser")
              : t("home.telegramUser")}
          </strong>
        </div>
      </Modal>

      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title={t("product.confirmOrder")}
        footer={
          <>
            <Button variant="secondary" block onClick={() => setShowOrderModal(false)}>
              {t("product.cancel")}
            </Button>
            <Button variant="primary" block loading={isSubmitting} onClick={submitOrder}>
              {t("product.confirmOrderButton")}
            </Button>
          </>
        }
      >
        <div className="modal__summary-row">
          <span>{t("product.product")}</span>
          <strong>{product.name}</strong>
        </div>
        <div className="modal__summary-row">
          <span>{t("product.price")}</span>
          <strong>{formatPrice(product.price, product.currency)}</strong>
        </div>
        <div className="modal__summary-row">
          <span>{t("product.quantity")}</span>
          <div className="quantity-stepper">
            <button
              type="button"
              className="quantity-stepper__btn"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="quantity-stepper__value">{quantity}</span>
            <button
              type="button"
              className="quantity-stepper__btn"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="modal__summary-row modal__summary-row--total">
          <span>{t("product.total")}</span>
          <strong>{formatPrice(product.price * quantity, product.currency)}</strong>
        </div>
      </Modal>

      <Modal
        isOpen={showShareSheet}
        onClose={() => {
          setShowShareSheet(false);
          setCopiedLink(false);
        }}
        title={t("product.shareTo")}
      >
        <div className="share-sheet">
          <button
            type="button"
            className="share-sheet__item"
            onClick={() => {
              handleCopyLink();
            }}
          >
            <span className="share-sheet__icon-wrap share-sheet__icon-wrap--copy">
              {copiedLink ? <Check size={18} /> : <Copy size={18} />}
            </span>
            <span className="share-sheet__label">{t("product.copyLink")}</span>
          </button>
          <button
            type="button"
            className="share-sheet__item"
            onClick={() => {
              handleShareTelegram();
              setShowShareSheet(false);
            }}
          >
            <span className="share-sheet__icon-wrap share-sheet__icon-wrap--telegram">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
            </span>
            <span className="share-sheet__label">{t("product.shareToTelegram")}</span>
            <ExternalLink size={14} className="share-sheet__link-icon" />
          </button>
          <button
            type="button"
            className="share-sheet__item"
            onClick={() => {
              handleShareWhatsApp();
              setShowShareSheet(false);
            }}
          >
            <span className="share-sheet__icon-wrap share-sheet__icon-wrap--whatsapp">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </span>
            <span className="share-sheet__label">{t("product.shareToWhatsApp")}</span>
            <ExternalLink size={14} className="share-sheet__link-icon" />
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              className="share-sheet__item"
              onClick={() => {
                handleNativeShare();
                setShowShareSheet(false);
              }}
            >
              <span className="share-sheet__icon-wrap share-sheet__icon-wrap--more">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 128 128" fill="currentColor">
                  <path d="M8 116q-.459 0-.918-.105A4.01 4.01 0 0 1 4 112c0-36.348 4.598-66.578 60-67.953V16a4 4 0 0 1 6.715-2.937l52 48c.82.753 1.285 1.82 1.285 2.937s-.465 2.184-1.285 2.938l-52 48a3.99 3.99 0 0 1-4.32.727A4 4 0 0 1 64 112V84.047c-38.004.91-45.016 14.93-52.422 29.742A4 4 0 0 1 8 116m60-40c2.211 0 4 1.789 4 4v22.863L114.102 64 72 25.137V48c0 2.211-1.789 4-4 4-44.188 0-53.703 17.09-55.574 44.387C20.711 85.258 34.832 76 68 76" />
                </svg>
              </span>
              <span className="share-sheet__label">{t("product.moreOptions")}</span>
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
