"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "habentech_favorites";
const EVENT_KEY = "habentech_favorites_updated";

function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage may be unavailable (private mode) — favorites just won't persist.
  }
}

const listeners = new Set<(ids: string[]) => void>();

function notifyAll(ids: string[]) {
  listeners.forEach((listener) => listener(ids));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: ids }));
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setFavorites(readFavorites());
    setIsLoaded(true);

    const handleUpdate = (updated: string[]) => {
      setFavorites(updated);
    };

    listeners.add(handleUpdate);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setFavorites(readFavorites());
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      listeners.delete(handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    const current = readFavorites();
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    writeFavorites(next);
    notifyAll(next);
  }, []);

  const isFavorite = useCallback((productId: string) => favorites.includes(productId), [favorites]);

  return { favorites, isFavorite, toggleFavorite, isLoaded };
}
