"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  surface?: "store" | "admin";
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * A select field that opens its options as a bottom-sheet overlay
 * instead of the browser's native dropdown — consistent look across
 * devices/browsers, and matches the app's other bottom-sheet modals.
 */
export default function Select({
  label,
  error,
  surface = "store",
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  id,
  name,
  className = "",
  ...rest
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectId = id ?? name;
  const selected = options.find((option) => option.value === value);
  const isAdmin = surface === "admin";

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <button
        type="button"
        id={selectId}
        className={`select select-trigger ${isAdmin ? "select--admin select-trigger--admin" : ""} ${className}`}
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        {...rest}
      >
        <span className={selected ? "select-trigger__value" : "select-trigger__placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={18} className="select-trigger__chevron" />
      </button>
      {error && <span className="admin-form__error">{error}</span>}

      {isOpen && (
        <div className="modal-overlay" role="presentation" onClick={() => setIsOpen(false)}>
          <div
            className={`modal ${isAdmin ? "modal--admin" : ""}`}
            role="listbox"
            aria-label={label ?? rest["aria-label"] ?? "Select an option"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h2 className="modal__title">{label ?? placeholder}</h2>
              <button
                type="button"
                className="modal__close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="select-sheet-list">
              {options.map((option) => {
                const isActive = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`select-sheet-option ${isAdmin ? "select-sheet-option--admin" : ""} ${isActive ? "select-sheet-option--active" : ""}`}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    {isActive && <Check size={18} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
