"use client";

import React, { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";

interface TelegramImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fileId?: string | null;
  fallbackIcon?: React.ReactNode;
}

export default function TelegramImage({
  fileId,
  src,
  alt = "Image",
  className = "",
  style,
  fallbackIcon,
  ...rest
}: TelegramImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(fileId && !src));
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    // If a direct URL is given (e.g. public static assets), use it directly
    if (src && typeof src === "string") {
      setResolvedUrl(src);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    if (!fileId) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    // Call internal media resolution API which caches Telegram CDN URLs
    fetch(`/api/media/${encodeURIComponent(fileId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to resolve Telegram file_id");
        return res.json();
      })
      .then((data: { url: string }) => {
        if (isMounted) {
          setResolvedUrl(data.url);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          // Fallback to direct redirect endpoint
          setResolvedUrl(`/api/media/${encodeURIComponent(fileId)}?redirect=true`);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fileId, src]);

  if (isLoading) {
    return (
      <div
        className={`telegram-img-skeleton ${className}`}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 120,
          background: "linear-gradient(90deg, #1c2230 25%, #252d40 50%, #1c2230 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        }}
      />
    );
  }

  if (hasError || !resolvedUrl) {
    return (
      <div
        className={`telegram-img-fallback ${className}`}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 120,
          backgroundColor: "#161b26",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          borderRadius: 8,
          ...style,
        }}
      >
        {fallbackIcon || <ImageOff size={28} opacity={0.6} />}
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      style={style}
      onError={() => setHasError(true)}
      loading="lazy"
      {...rest}
    />
  );
}