export function Spinner({ surface = "store" }: { surface?: "store" | "admin" }) {
  return <span className={`spinner ${surface === "admin" ? "spinner--admin" : ""}`} aria-label="Loading" />;
}

export function LoadingPage({ surface = "store" }: { surface?: "store" | "admin" }) {
  return (
    <div className="loading-page">
      <Spinner surface={surface} />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-card__image" />
      <div className="skeleton-card__body">
        <div className="skeleton skeleton-line" style={{ width: "85%" }} />
        <div className="skeleton skeleton-line" style={{ width: "55%" }} />
        <div className="skeleton skeleton-line" style={{ width: "40%" }} />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
