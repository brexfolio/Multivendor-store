"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage, type Language } from "@/lib/i18n";
import Modal from "@/components/ui/Modal";
import { hapticImpact } from "@/lib/telegram";

const OPTIONS: { value: Language; label: string; code: string }[] = [
  { value: "en", label: "English", code: "Eng" },
  { value: "am", label: "አማርኛ", code: "አማ" },
];

interface LanguageSwitcherProps {
  surface?: "store" | "admin";
}

export default function LanguageSwitcher({ surface = "store" }: LanguageSwitcherProps) {
  const { lang, setLang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const activeCode = OPTIONS.find((option) => option.value === lang)?.code;
  const isAdmin = surface === "admin";

  return (
    <>
      <button
        type="button"
        className={`store-header__lang-btn ${isAdmin ? "store-header__lang-btn--admin" : ""}`}
        onClick={() => {
          hapticImpact("light");
          setIsOpen(true);
        }}
        aria-label={t("language.title")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={`store-header__lang-code ${isAdmin ? "store-header__lang-code--admin" : ""}`}>
          {activeCode}
        </span>
        <ChevronDown size={14} className={`store-header__lang-chevron ${isAdmin ? "store-header__lang-chevron--admin" : ""}`} />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("language.title")}
        surface={surface}
      >
        <div className="select-sheet-list">
          {OPTIONS.map((option) => {
            const active = lang === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`select-sheet-option ${
                  isAdmin ? "select-sheet-option--admin" : ""
                } ${active ? "select-sheet-option--active" : ""}`}
                onClick={() => {
                  setLang(option.value);
                  setIsOpen(false);
                }}
              >
                <span>
                  {option.label}
                  <span className={`select-sheet-option__code ${isAdmin ? "select-sheet-option__code--admin" : ""}`}>
                    {option.code}
                  </span>
                </span>
                {active && <Check size={18} />}
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}