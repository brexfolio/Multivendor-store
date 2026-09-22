import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  surface?: "store" | "admin";
  action?: ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  surface = "store",
  action,
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${surface === "admin" ? "empty-state--admin" : ""}`}>
      <div className="empty-state__icon">{icon}</div>
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__desc">{description}</p>}
      {action}
    </div>
  );
}
