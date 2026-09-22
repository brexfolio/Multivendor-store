"use client";

import type { LucideIcon } from "lucide-react";

interface AdminActionCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  tone?: "primary" | "accent" | "success" | "warning" | "danger";
  badge?: number;
}

const ICON_TONE_CLASS: Record<string, string> = {
  primary: "admin-action-card__icon--primary",
  accent: "admin-action-card__icon--accent",
  success: "admin-action-card__icon--success",
  warning: "admin-action-card__icon--warning",
  danger: "admin-action-card__icon--danger",
};

export default function AdminActionCard({
  icon: Icon,
  label,
  description,
  onClick,
  tone = "primary",
  badge,
}: AdminActionCardProps) {
  return (
    <button type="button" className="admin-action-card" onClick={onClick}>
      <div className={`admin-action-card__icon ${ICON_TONE_CLASS[tone]}`}>
        <Icon size={19} strokeWidth={2} />
      </div>
      <div className="admin-action-card__content">
        <p className="admin-action-card__label">{label}</p>
        <p className="admin-action-card__desc">{description}</p>
      </div>
      {badge != null && badge > 0 && (
        <span className="admin-action-card__badge">{badge}</span>
      )}
    </button>
  );
}
