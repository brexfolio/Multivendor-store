"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  surface?: "store" | "admin";
}

export function Input({ label, error, surface = "store", id, className = "", ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input ${surface === "admin" ? "input--admin" : ""} ${className}`}
        {...rest}
      />
      {error && <span className="admin-form__error">{error}</span>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  surface?: "store" | "admin";
}

export function Textarea({ label, error, surface = "store", id, className = "", ...rest }: TextareaProps) {
  const textareaId = id ?? rest.name;
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`textarea ${surface === "admin" ? "textarea--admin" : ""} ${className}`}
        {...rest}
      />
      {error && <span className="admin-form__error">{error}</span>}
    </div>
  );
}

export default Input;
