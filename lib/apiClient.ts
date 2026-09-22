"use client";

import { getInitData } from "./telegram";

export class ApiError extends Error {}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const initData = getInitData();
  const headers = new Headers(options.headers);
  if (initData) headers.set("X-Telegram-Init-Data", initData);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error ?? "Something went wrong. Please try again.");
  }

  return data as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url, { method: "GET" });
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    body: body !== undefined ? JSON.stringify({ ...body, init_data: getInitData() }) : undefined,
  });
}

export function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: "PATCH",
    body: JSON.stringify({ ...(body as object), init_data: getInitData() }),
  });
}

export function apiDelete<T>(url: string): Promise<T> {
  return request<T>(url, { method: "DELETE" });
}

export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const initData = getInitData();
  if (initData) formData.set("init_data", initData);

  const response = await fetch(url, { method: "POST", body: formData });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error ?? "Upload failed. Please try again.");
  }

  return data as T;
}
